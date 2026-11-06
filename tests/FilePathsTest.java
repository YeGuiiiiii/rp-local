import com.rphub.app.LocalPaths;
import java.io.File;

public final class FilePathsTest {
    public static void main(String[] args) throws Exception {
        File base = new File(args[0]);
        File privateRoot = new File(base, "private/个人数据");
        File sharedRoot = new File(base, "external");
        String personal = LocalPaths.resolve(privateRoot, sharedRoot, "个人数据/settings.json").getCanonicalPath();
        String card = LocalPaths.resolve(privateRoot, sharedRoot, "角色卡数据/卡片/角色卡.json").getCanonicalPath();
        if (!personal.contains("private") || !card.contains("external")) throw new AssertionError("Wrong storage root");
        for (String invalid : new String[] { "../secret", "/图片/x", "图片/../个人数据/x",
                "图片/卡片/../../x", "图片//x", "图片/./x", "图片\\x", "未知/x" }) {
            try {
                LocalPaths.resolve(privateRoot, sharedRoot, invalid);
                throw new AssertionError("Accepted unsafe path: " + invalid);
            } catch (java.io.IOException expected) {}
        }
        System.out.println("Native file root separation and eight invalid paths passed.");
    }
}
