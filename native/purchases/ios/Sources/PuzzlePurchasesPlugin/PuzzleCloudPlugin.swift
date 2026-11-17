import Foundation
import Capacitor
import CloudKit
import UIKit

@objc(PuzzleCloudPlugin)
public class PuzzleCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PuzzleCloudPlugin"
    public let jsName = "PuzzleCloud"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openPrivacyPolicy", returnType: CAPPluginReturnPromise)
    ]
    private var container: CKContainer {
        CKContainer(identifier: "iCloud." + (Bundle.main.bundleIdentifier ?? ""))
    }
    private let recordID = CKRecord.ID(recordName: "progress-v1")

    private func fetch(_ database: CKDatabase) async throws -> CKRecord? {
        do { return try await database.record(for: recordID) }
        catch let error as CKError where error.code == .unknownItem { return nil }
    }
    private func result(_ record: CKRecord?) -> [String: Any] {
        ["payload": (record?["payload"] as? String).map { $0 as Any } ?? NSNull(),
         "revision": record?.recordChangeTag.map { $0 as Any } ?? NSNull()]
    }
    private func account() async throws -> CKDatabase {
        let cloud = container
        guard try await cloud.accountStatus() == .available else {
            throw NSError(domain: "PuzzleCloud", code: 1, userInfo: [NSLocalizedDescriptionKey: "Check your iCloud sign-in and device settings."])
        }
        return cloud.privateCloudDatabase
    }
    @objc func read(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let database = try await account()
                call.resolve(result(try await fetch(database)))
            } catch { call.reject("Unable to read your iCloud save. Check sign-in, network, and app settings.", nil, error) }
        }
    }
    @objc func write(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload"), payload.utf8.count <= 700_000 else {
            call.reject("The save size is invalid."); return
        }
        Task { @MainActor in
            do {
                let database = try await account()
                let current = try await fetch(database)
                guard current?.recordChangeTag == call.getString("revision") else {
                    call.reject("Your iCloud save changed on another device. Check the iCloud save again.", "CLOUD_CONFLICT"); return
                }
                let record = current ?? CKRecord(recordType: "PuzzleSave", recordID: recordID)
                record["payload"] = payload as CKRecordValue
                // Compare-and-swap also catches a second writer between fetch and save.
                let (saved, _) = try await database.modifyRecords(saving: [record], deleting: [], savePolicy: .ifServerRecordUnchanged, atomically: true)
                guard let outcome = saved[recordID] else {
                    call.reject("Unable to confirm the iCloud save."); return
                }
                call.resolve(result(try outcome.get()))
            } catch {
                let cloudError = error as? CKError
                let conflict = cloudError?.code == .serverRecordChanged ||
                    cloudError?.partialErrorsByItemID?.values.contains { ($0 as? CKError)?.code == .serverRecordChanged } == true
                call.reject(conflict ? "Your iCloud save changed on another device. Check the iCloud save again." : "Unable to save to iCloud. Check sign-in, network, and available storage.", conflict ? "CLOUD_CONFLICT" : "CLOUD_SAVE", error)
            }
        }
    }
    @objc func openPrivacyPolicy(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UIApplication.shared.open(URL(string: "https://www.comino.app/girl-privacy")!) { opened in
                if opened { call.resolve() } else { call.reject("Unable to open the privacy policy.") }
            }
        }
    }
}
