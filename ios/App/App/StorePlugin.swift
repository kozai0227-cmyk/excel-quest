import UIKit
import Capacitor
import StoreKit

/// ゲーム画面。このアプリ専用の 部品（StorePlugin）を 登録する
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StorePlugin())
    }
}

/// App 内課金（StoreKit 2）。非消耗型の 商品を 1つ 扱う。
/// 支払いは すべて Apple が 処理し、このアプリは 購入済みか どうかだけを 受け取る（外部への 通信なし）
@objc(StorePlugin)
public class StorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorePlugin"
    public let jsName = "Store"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "product", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    private var updates: Task<Void, Never>?

    override public func load() {
        // 承認待ち（ファミリー共有の「承認と購入のリクエスト」など）が あとから 通ったときも 受け取る
        updates = Task.detached { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                await transaction.finish()
                self?.notifyListeners("owned", data: [
                    "id": transaction.productID,
                    "owned": transaction.revocationDate == nil
                ])
            }
        }
    }

    deinit {
        updates?.cancel()
    }

    /// 商品の 名前と 価格（その国の 通貨で 表示用に 整えた もの）
    @objc func product(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id がありません")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("商品が見つかりません", "NOT_FOUND")
                    return
                }
                call.resolve(["name": product.displayName, "price": product.displayPrice])
            } catch {
                call.reject(error.localizedDescription, "FAILED")
            }
        }
    }

    /// 購入する。status は purchased / cancelled / pending
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id がありません")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("商品が見つかりません", "NOT_FOUND")
                    return
                }
                switch try await product.purchase() {
                case .success(let result):
                    guard case .verified(let transaction) = result else {
                        call.reject("購入を確認できませんでした", "UNVERIFIED")
                        return
                    }
                    await transaction.finish()
                    call.resolve(["status": "purchased"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "cancelled"])
                }
            } catch {
                call.reject(error.localizedDescription, "FAILED")
            }
        }
    }

    /// 購入済みか（端末に 記録された 購入履歴で 調べる。通信は 不要）
    @objc func owned(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id がありません")
            return
        }
        Task {
            let owned = await StorePlugin.isOwned(id)
            call.resolve(["owned": owned])
        }
    }

    /// 購入を 復元する（App Store と 同期してから 調べる）
    @objc func restore(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id がありません")
            return
        }
        Task {
            do {
                try await AppStore.sync()
            } catch StoreKitError.userCancelled {
                // サインインを やめた ときなど。端末に ある 記録だけで 調べる
                let owned = await StorePlugin.isOwned(id)
                call.resolve(["owned": owned, "cancelled": true])
                return
            } catch {
                call.reject(error.localizedDescription, "FAILED")
                return
            }
            let owned = await StorePlugin.isOwned(id)
            call.resolve(["owned": owned])
        }
    }

    private static func isOwned(_ id: String) async -> Bool {
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == id, transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }
}
