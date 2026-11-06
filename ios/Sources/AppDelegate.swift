import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {}

final class RPSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = RPViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}
