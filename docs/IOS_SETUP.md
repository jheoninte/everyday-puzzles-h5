# iOS 빌드와 계정 연결

구현 상태: iOS 프로젝트 생성·웹 빌드·Capacitor 동기화 및 JavaScript 모의 SDK 검증 완료. 2026-11-17 Apple Developer App ID와 App Store Connect 앱·비소모성 상품 등록을 확인했다. Swift 컴파일, 서명, 실제 Google UMP·광고·StoreKit 결제는 아직 iPhone에서 검증하지 않았다. 심사 제출·출시는 하지 않았다.

## 프로젝트 식별자

설정 원본은 `config/native.json`이다. 계정 암호·서명 인증서·API 키는 필요하지 않으며 저장소에 넣지 않는다.

| 항목 | 값 |
| --- | --- |
| 표시 이름 | Everyday Puzzles |
| 영어 App Store 이름 | Everyday Puzzles:Word & Sudoku |
| 스토어 기본 언어 | 영어(미국), en-US; 한국어 현지화 유지 |
| Bundle ID (사용자 지정) | `com.interestllc.everydaypuzzles` |
| Apple App ID | `6835714051` |
| Developer 팀 | INTEREST LLC., `79978S7426` |
| SKU | `everydaypuzzles-ios` |
| 광고 제거 상품 ID (등록 완료) | `com.interestllc.everydaypuzzles.removeads` |
| 상품 Apple ID | `6835717292` |
| 상품 종류 | 비소모성, 전면 광고 제거, 보상형 광고는 별도 선택 |
| iOS 최소 버전 | 생성한 프로젝트 기준 15.0 |
| 대상 | iPhone, 세로 화면 |
| 의존성 관리 | Swift Package Manager, npm 잠금 파일 |

광고 모드는 `test`이며 Google 공식 iOS 테스트 앱·전면·보상형 광고 ID만 들어 있다. 테스트 모드는 실제 AdMob 앱 ID로 바꾸기 전에도 네이티브 통합 검증을 시작할 수 있다. 테스트 광고는 수익을 발생시키지 않는다. UMP 지역별 동의 화면 검증에는 자신의 AdMob 앱과 개인정보 메시지 구성이 필요할 수 있다.

## Mac mini에서 실행

1. 전체 소스와 `package-lock.json`, `native/`, `ios/`, `config/`를 옮긴다. `node_modules`, `dist`, Xcode 빌드 결과는 복사하지 않는다. 아직 커밋하지 않은 파일도 반드시 포함한다.
2. Node.js 22 LTS와 Xcode를 설치하고 Xcode를 한 번 실행한다. SDK 의존성이 요구하는 최신 호환 Xcode와 iOS 플랫폼을 설치한다.
3. 저장소 루트에서 실행한다.

```sh
npm ci
npm run ios:sync
npm run ios:open
```

`ios/`가 이미 있으므로 `ios:add`는 다시 실행하지 않는다. 웹 또는 플러그인 소스를 바꿀 때마다 `ios:sync`를 실행한다. 이 명령은 웹 빌드, 플러그인 연결, Bundle ID·Info.plist·개인정보 리소스 설정을 반영한다. `.xcconfig`나 계정의 서명 팀을 임의로 선택하지 않는다.

4. Xcode의 App 타깃 → Signing & Capabilities에서 본인의 Apple Developer 팀과 Bundle ID를 선택한다. 실제 기기를 선택하고 Run을 실행한다. 서명 인증서는 Mac의 Keychain과 Xcode에서 관리한다.
5. 먼저 광고와 구매를 사용하지 않고 네 게임·자동 저장·백그라운드 복귀·오프라인 플레이를 검사한다.

## App Store Connect

[App Store Connect 앱](https://appstoreconnect.apple.com/apps/6835714051/distribution/info)은 등록되어 있다. Mac에서 위 팀과 Bundle ID를 사용하며 새 앱을 중복 생성하지 않는다. 기존 영어 이름 `Everyday Puzzles`는 중복으로 거절되어, 사용자가 승인한 확장 이름을 30자 제한에 맞춰 `Everyday Puzzles:Word & Sudoku`로 저장했다. 기기의 짧은 표시 이름은 기존 `Everyday Puzzles`를 유지한다.

웹에서 확인·저장한 항목(2026-11-17):

- 기본 언어 영어(미국), 영문 이름·부제·소개·프로모션 문구·검색어. 한국어 현지화도 유지한다.
- 게임 → 퍼즐·단어 분류, 광고 있음/채팅·UGC·도박·폭력 등 없음에 따른 연령 설문 저장. 현재 기본 등급 4+, Kids 카테고리 미선택. 콘텐츠·광고 구성이 바뀌면 다시 검토한다. Game Center는 미활성 상태다.
- 앱 가격 무료 확인. 앱·상품 모두 중국 본토를 제외한 174개 국가·지역으로 설정. Mac 및 Vision Pro 호환 앱 배포는 해제했다.
- 버전 1.0은 로그인 불필요·수동 출시. 빌드는 아직 업로드하지 않았다.
- [전면 광고 제거 상품](https://appstoreconnect.apple.com/apps/6835714051/distribution/iaps/6835717292)은 비소모성으로 생성하고 영어 표시명 `Remove Interstitial Ads`와 설명을 저장했다. 미국 기준 $2.99와 Apple 자동 환산 가격을 저장했다(현재 한국 ₩4,400, 일본 ¥500; 향후 변경 가능). 보상형 광고 유지, 가족 공유 미활성. 상품은 제출 준비 중이다.

2026-11-17 사용자 동의 후 앱 개인정보 답변 6개 유형의 공개를 완료했다. 기존 `https://www.comino.app/girl-privacy` 방침의 이 게임 적용 여부도 사용자에게 확인했다. 목적·사용자 연결·추적 여부와 판단 근거는 `docs/APP_PRIVACY.md`에 기록했다.

남은 항목: 실제 iPhone 빌드와 검수, CloudKit 계정·서명·운영 스키마 설정, 앱 아이콘·스크린샷·IAP 심사 스크린샷, 지원 URL, 출시 빌드의 SDK 개인정보 리포트와 공개 답변 대조, 심사 연락처, 배포 지역별 컴플라이언스 확인. 앱 설정의 개인정보처리방침 링크는 구현했다. 유료 앱 계약·세금·은행 정보의 완료 여부는 이번 작업에서 확인하지 않았다. 필요한 계약 동의와 금융 정보 입력은 계정 소유자가 처리한다.

가격은 앱에서 하드코딩하지 않고 StoreKit의 `displayPrice`를 표시한다. 앱과 첫 인앱 상품은 준비가 완료되면 함께 심사 제출한다. 설정 증빙은 `docs/app-store-english-primary.jpg`와 `docs/app-store-iap.jpg`에 저장했다.

Xcode에서 StoreKit Configuration 파일을 만들고 같은 ID의 비소모성 상품을 추가한 다음 실행 Scheme에 연결하면 로컬 구매를 테스트할 수 있다. 실제 스토어 상품 조회와 복원은 이후 Sandbox/TestFlight에서도 따로 확인한다. 실제 결제로 테스트하지 않는다.

구매 성공은 StoreKit의 검증된 트랜잭션만 인정한다. 취소·보류는 권한을 주지 않는다. 트랜잭션 업데이트와 앱 복귀 시 재조회, `AppStore.sync()`를 이용한 명시적 복원을 구현했다. 오프라인/조회 실패 때는 이전 검증 권한을 유지한다. 환불·철회 반영은 StoreKit 업데이트/온라인 재조회에 의존하며 자체 서버 알림은 없다.

## AdMob

[AdMob](https://admob.google.com/)에서 iOS 앱을 등록하고 전면 광고와 보상형 광고 단위를 각각 하나 만든다. 아직 출시되지 않은 앱으로 시작할 수 있다. 개인정보 보호 및 메시지에서 필요한 지역별 UMP 메시지를 설정한다.

실기기 테스트가 끝나면 `config/native.json`의 앱 ID(`~` 포함)와 광고 단위 ID(`/` 포함)를 구분해서 교체하고 `adsMode`를 `production`으로 바꾼 뒤 `ios:sync`를 실행한다. 출시 전 형식 점검은 `node tools/configure-ios.mjs --release`로 실행한다. 이 점검은 테스트 ID 실수를 잡는 도구이며 출시 승인 검사를 대신하지 않는다.

- 무료 힌트 3회 소진 후 직접 선택한 보상형 광고만 요청한다. SDK의 보상 결과를 단일 지급 근거로 사용하고 광고 종료 후 힌트를 적용한다. 동일 보상 ID는 보드에 한 번만 반영한다.
- 신규 완료 2개는 전면 광고를 면제하고, 이후 3개마다 결과를 벗어나는 시점에만 표시한다. 최소 180초 간격을 지킨다. 준비되지 않은 광고는 기다리지 않고 건너뛴다. 광고 기회·마지막 표시 시각을 별도로 저장한다.
- 광고 제거 구매자는 전면 광고가 나오지 않는다. 보상형 광고는 계속 자발적으로 선택할 수 있다.
- 동의 정보와 `canRequestAds`를 확인한 후 광고 SDK를 초기화한다. 설정에서 SDK가 요구한 개인정보 선택을 다시 열 수 있다. 현재 비개인화 요청을 사용하고 ATT 요청을 호출하지 않는다. 이것만으로 모든 개인정보 의무가 해결되지는 않는다.
- `SKAdNetworkItems`에는 현재 Google의 기본 식별자만 넣었다. 출시 전 [Google iOS 시작 안내](https://developers.google.com/admob/ios/quick-start)에 있는 실제 SDK/네트워크 목록과 개인정보 공개·매니페스트를 검토·보완해야 한다.

## 저장과 검수

앱의 기본 UI는 영어로 정리했다. 홈·팩·게임 4종·결과·기록·상점·설정·iCloud와 네이티브 구매 오류 문구, 팩 제목 및 콘텐츠 힌트가 포함된다. 웹 `lang`은 `en`이다. 저장 키·팩 ID·정답·보상 규칙은 유지하고, 이전 저장의 일시적인 오류 문구는 보드 복원 시 제거한다. 시스템 결제·광고 동의 화면의 언어와 현지 통화 표시는 OS/SDK 설정을 따른다. 앱 내 언어 전환 기능은 아직 없다.

영어 화면 검수 증빙: `docs/english-home-mobile.jpg`, `docs/english-sudoku-mobile.jpg`. 320px 너비에서 홈·상점·설정·게임 4종의 가로 넘침 및 한국어 잔여 표시를 검사했다.

iOS에서는 Capacitor Preferences를 시작 전에 읽고 입력·결과를 순서대로 기록한다. 웹 미리보기는 계속 localStorage를 사용하며 웹 기록이 기기로 자동 전송되지는 않는다. UserDefaults 용도(`CA92.1`)를 앱 개인정보 매니페스트에 등록했다. 광고 SDK의 데이터 수집 공개와 개인정보처리방침은 별도로 실제 동작에 맞춰 작성해야 한다.

검수할 항목: 새 설치·재실행·진행 초기화, 작은 iPhone의 Safe Area, 백그라운드 복귀, 광고 성공·취소·재고 없음·오프라인·중복 탭, 광고 중 시간 정지, 결제 성공·취소·보류·복원·재설치·환불 반영, 구매자의 전면 광고 제거. 모의 SDK 검증 통과가 이 실기기 검수를 대체하지 않는다.

첫 네이티브 빌드가 통과한 뒤 앱 아이콘·런치 화면·개인정보처리방침 URL·스토어 메타데이터·80문제 콘텐츠를 완성하고 TestFlight로 진행한다. 지금 포함된 Capacitor 기본 아이콘과 스플래시는 출시 자산이 아니다.

## iCloud 기록 보관 (코드 구현, Apple 설정·실기기 검수 대기)

설정 → iCloud 기록 보관에서 현재 기기와 클라우드의 완료 수·XP·저장 시각을 확인하고 직접 저장/불러오기한다. 자동 기기간 동기화나 기록 합산은 하지 않는다. CloudKit 개인 데이터베이스의 한 슬롯을 사용하며 자체 서버는 필요하지 않다. Apple의 기본 제공 한도로 시작하고 실제 사용량·정책은 CloudKit Console에서 확인한다.

- 컨테이너: `iCloud.com.interestllc.everydaypuzzles`
- private database / default zone / record type `PuzzleSave` / record name `progress-v1` / String field `payload`
- 저장 버전 1, UTF-8 최대 700,000바이트. 프로필 v2, 보드, 실패 이력을 보관한다. 구매 권한·광고 빈도·동의 정보는 업로드하거나 덮어쓰지 않는다.
- 저장 전 읽은 `recordChangeTag`가 다르면 덮어쓰기를 차단한다. 조회와 저장 사이의 경쟁도 `.ifServerRecordUnchanged`로 차단한다. 충돌 후 다시 확인하고 원하는 기록을 선택한다.
- 불러오기는 전체 교체이며 XP·배지·보상을 합산하지 않는다. 직전 기기 기록을 별도 보관하며 설정에서 되돌릴 수 있다. 복원 저널을 먼저 저장하므로 종료/저장 오류 후 다음 실행에서 복원을 완료하기 전에는 게임을 렌더링하지 않는다.
- 게임 초기화는 기기 기록과 직전 복원 백업만 지운다. iCloud 기록과 StoreKit 권한은 유지된다. iCloud 기록을 초기 상태로 바꾸려면 초기화한 기기에서 iCloud 저장을 명시적으로 선택한다.

Mac에서 반드시 완료할 작업:

1. Xcode → Signing & Capabilities → iCloud → CloudKit 활성화. Team `79978S7426`에 위 컨테이너를 생성/선택하고 App ID와 연결한다. 저장소의 `App.entitlements`만으로 Apple 계정의 권한·프로비저닝 설정은 완료되지 않는다.
2. 개발 서명으로 실행해 저장하여 스키마를 만든다. CloudKit Console에서 `PuzzleSave.payload` 스키마를 확인하고 **Deploy Schema Changes to Production**을 완료한다. TestFlight는 운영 환경을 사용한다. 개발 기록이 운영 환경으로 자동 복사되지는 않는다.
3. 같은 iCloud 계정의 두 실제 기기에서 저장/복원, 동시 저장 충돌, 오프라인, 로그아웃, 저장 공간 부족, 앱 종료 중 복원, 복원 되돌리기를 검증한다. 구매 복원은 상점에서 별도로 검증한다.
4. iCloud 업로드가 추가되었으므로 `docs/APP_PRIVACY.md`의 출시 전 검토를 완료한다.

`npm run test:cloud`는 실제 TypeScript 저장 코드와 네이티브 경계 모의 객체로 제외 항목·충돌·오류·중단 복구를 검사한다. Windows에서 Swift 컴파일과 실제 CloudKit 연결은 검증하지 못했다.
