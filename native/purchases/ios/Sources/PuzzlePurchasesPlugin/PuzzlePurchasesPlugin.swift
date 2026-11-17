import Foundation
import Capacitor
import StoreKit
import Network

@objc(PuzzlePurchasesPlugin)
public class PuzzlePurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PuzzlePurchasesPlugin"
    public let jsName = "PuzzlePurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?
    private var purchaseInProgress = false
    private let network = NWPathMonitor()
    private let cacheKey = "EverydayPuzzles.StoreKit.removeAds.verified"
    private var productId: String { Bundle.main.object(forInfoDictionaryKey: "PuzzleRemoveAdsProductId") as? String ?? "" }

    public override func load() {
        network.start(queue: DispatchQueue(label: "EverydayPuzzles.StoreKit.network"))
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                // Never finish or grant an unverified transaction.
                guard case .verified(let transaction) = result, transaction.productID == self.productId else { continue }
                UserDefaults.standard.set(transaction.revocationDate == nil, forKey: self.cacheKey)
                let entitlement = await self.entitlements()
                self.notifyListeners("entitlementsChanged", data: entitlement)
                await transaction.finish()
            }
        }
    }
    deinit { updates?.cancel(); network.cancel() }

    private func entitlements() async -> [String: Any] {
        if network.currentPath.status != .satisfied {
            return ["removeAds": UserDefaults.standard.bool(forKey: cacheKey), "source": "cache"]
        }
        var removeAds = false
        var unverified = false
        for await result in Transaction.currentEntitlements {
            switch result {
            case .verified(let transaction):
                if transaction.productID == productId && transaction.revocationDate == nil && !transaction.isUpgraded {
                    removeAds = true
                }
            case .unverified:
                unverified = true
            }
        }
        if unverified && !removeAds {
            // A verification failure is not proof that a previously valid purchase was revoked.
            return ["removeAds": UserDefaults.standard.bool(forKey: cacheKey), "source": "cache"]
        }
        UserDefaults.standard.set(removeAds, forKey: cacheKey)
        return ["removeAds": removeAds, "source": "storekit"]
    }

    @objc func getProduct(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard !productId.isEmpty else { call.reject("The product ID is not configured."); return }
                guard let product = try await Product.products(for: [productId]).first else {
                    call.resolve(["product": NSNull()]); return
                }
                call.resolve(["product": ["id": product.id, "title": product.displayName, "priceLabel": product.displayPrice]])
            } catch { call.reject("Unable to load the store product.", nil, error) }
        }
    }

    @objc func getEntitlements(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(await entitlements()) }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchaseInProgress else { call.reject("A purchase is already in progress."); return }
            guard call.getString("productId") == productId, !productId.isEmpty else { call.reject("Invalid product."); return }
            purchaseInProgress = true
            defer { purchaseInProgress = false }
            do {
                guard let product = try await Product.products(for: [productId]).first, product.type == .nonConsumable else {
                    call.reject("The Remove Interstitial Ads product was not found."); return
                }
                switch try await product.purchase() {
                case .success(let result):
                    guard case .verified(let transaction) = result, transaction.productID == productId else {
                        call.reject("Unable to verify this purchase."); return
                    }
                    UserDefaults.standard.set(transaction.revocationDate == nil, forKey: cacheKey)
                    let entitlement = await entitlements()
                    notifyListeners("entitlementsChanged", data: entitlement)
                    await transaction.finish()
                    call.resolve(entitlement.merging(["status": "purchased"]) { _, new in new })
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.reject("Unknown purchase status.")
                }
            } catch { call.reject("Unable to complete the purchase.", nil, error) }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()
                let entitlement = await entitlements()
                notifyListeners("entitlementsChanged", data: entitlement)
                call.resolve(entitlement)
            } catch { call.reject("Unable to restore purchases.", nil, error) }
        }
    }
}
