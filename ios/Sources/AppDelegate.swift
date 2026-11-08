import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {}

final class RPSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        #if targetEnvironment(macCatalyst)
        // 桌面窗口：最小保持手机宽度的布局可用，默认给一个舒适的竖向尺寸。
        scene.sizeRestrictions?.minimumSize = CGSize(width: 420, height: 640)
        scene.title = "RP 本地版"
        #endif
        let window = UIWindow(windowScene: scene)
        window.rootViewController = RPViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}
