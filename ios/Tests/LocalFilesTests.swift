import XCTest
@testable import RPLocal

final class LocalFilesTests: XCTestCase {
    private var root: URL!
    private var files: LocalFiles!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        files = LocalFiles(root: root)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try FileManager.default.removeItem(at: root)
    }

    func testRejectsTraversalAndSymlinks() throws {
        for path in ["../outside", "图片/../../outside", "/图片/x", "图片//x", "图片/./x", "图片\\x", "other/x"] {
            XCTAssertThrowsError(try files.file(path), path)
        }
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("图片"),
                                                  withDestinationURL: root.deletingLastPathComponent())
        XCTAssertThrowsError(try files.file("图片/outside"))
    }

    func testReopeningStorageKeepsUnicodeChatAndSkipsUnchangedWrites() throws {
        let name = "角色卡数据/测试卡/聊天.json"
        XCTAssertEqual(try files.call("writeText", [name, "{\"content\":\"你好\"}"]) as? Bool, true)
        let reopened = LocalFiles(root: root)
        XCTAssertEqual(try reopened.call("readText", [name]) as? String, "{\"content\":\"你好\"}")
        XCTAssertEqual(try reopened.call("writeTextIfChanged", [name, "{\"content\":\"你好\"}"]) as? Bool, false)
        XCTAssertEqual(try reopened.call("writeTextIfChanged", [name, "{}"]) as? Bool, true)
        XCTAssertTrue(try reopened.call("readText", ["个人数据/missing.json"]) is NSNull)
    }

    func testImagesRoundTripAndDirectoriesCannotBeDeleted() throws {
        let name = "图片/测试卡/image.png"
        XCTAssertEqual(try files.call("writeImage", [name, "iVBORw=="]) as? Bool, true)
        let image = try XCTUnwrap(files.call("readImage", [name]) as? [String: String])
        XCTAssertEqual(image["base64"], "iVBORw==")
        XCTAssertEqual(image["mime"], "image/png")
        XCTAssertEqual(try files.call("exists", ["图片/测试卡"]) as? Bool, false)
        XCTAssertThrowsError(try files.call("remove", ["图片/测试卡"]))
        XCTAssertThrowsError(try files.call("writeImage", ["个人数据/image.png", "iVBORw=="]))
        XCTAssertEqual(try files.call("remove", [name]) as? Bool, true)
        XCTAssertEqual(try files.call("exists", [name]) as? Bool, false)
    }
}
