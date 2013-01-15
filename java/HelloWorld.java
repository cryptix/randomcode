import org.apache.xml.security.utils.Base64;

public class HelloWorld {

	public static String encryptBase64(String x)  {

		// previously used jboss class uses ISO-8859-1 encoding
		return new String(Base64.encode(encrypt(x).getBytes("ISO-8859-1")));


	}
	
	public static String encryptPw(String username, String password) {
		return encryptBase64(username.toLowerCase() + ((password == null) ? "" : password));
	}

    public static void main(String[] args) {
    	String passwdEncrypted = StringUtils.encryptPw(user.getName(), user.getNewPassword());


        System.out.println("Hello, World");
    }

}