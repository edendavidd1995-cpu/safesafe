import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 0x5B/255, green: 0x3D/255, blue: 0xF5/255, alpha: 1)
        window?.rootViewController = SafeSafeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The site is a static multi-page export (/item/index.html, /order/index.html …).
/// Capacitor's default router sends every extension-less path to the root index.html,
/// which would open the home page instead of the right screen on a full page load.
struct StaticSiteRouter: Router {
    var basePath: String = ""
    func route(for path: String) -> String {
        let url = URL(fileURLWithPath: path)
        guard url.pathExtension.isEmpty else { return basePath + path }
        let trimmed = path.hasSuffix("/") ? String(path.dropLast()) : path
        let candidate = basePath + trimmed + "/index.html"
        if !trimmed.isEmpty, FileManager.default.fileExists(atPath: candidate) {
            return candidate
        }
        return basePath + "/index.html"
    }
}

class SafeSafeViewController: CAPBridgeViewController {
    override func router() -> Router { StaticSiteRouter() }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true   // iOS swipe-back
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.isOpaque = false
        webView?.backgroundColor = UIColor(red: 0xF4/255, green: 0xF1/255, blue: 0xFF/255, alpha: 1)
    }
}
