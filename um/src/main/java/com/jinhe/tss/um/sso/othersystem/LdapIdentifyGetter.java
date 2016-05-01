package com.jinhe.tss.um.sso.othersystem;

import java.util.Hashtable;

import javax.naming.Context;
import javax.naming.NamingException;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;

import com.jinhe.tss.framework.component.param.ParamConfig;
import com.jinhe.tss.framework.sso.IPWDOperator;
import com.jinhe.tss.framework.sso.IdentityGetter;
import com.jinhe.tss.um.sso.UMIdentityGetter;
import com.jinhe.tss.util.EasyUtils;
 
public class LdapIdentifyGetter extends UMIdentityGetter implements IdentityGetter {
    
    /**
     * 判断用户输入的密码是否和LDAP中的密码一致，如果是，则将用户的平台里的密码也设置为该密码。
     * 注 ： 需要在相应的系统参数管理模块里增加 oa.ldap.url 参数。
     * 
     * @param userId
     * @param passwd
     * @return
     */
    public boolean indentify(IPWDOperator operator, String passwd) {
    	log.debug("用户登陆时密码在主用户组中验证不通过，转向LDAP进行再次验证。");
        
        // 取主用户的对应用户    
    	String user = operator.getLoginName();
        String oaLdapUrl = ParamConfig.getAttribute("oa.ldap.url");
        if( EasyUtils.isNullOrEmpty(oaLdapUrl) ) return false;
        
        // 初始化参数设置
        Hashtable<String, String> env = new Hashtable<String, String>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
        env.put(Context.SECURITY_AUTHENTICATION, "simple");
		env.put(Context.PROVIDER_URL, oaLdapUrl);
        env.put(Context.SECURITY_PRINCIPAL, getUserDN(user));
        env.put(Context.SECURITY_CREDENTIALS, passwd);

        // 连接到数据源
        DirContext ctx = null;
        try {
            ctx = new InitialDirContext(env);
            log.debug("用户【" + user + "】的密码在LDAP中验证通过。");
            return true; // 如果连接成功则返回True
        } 
        catch (Exception e) {
            log.debug("用户【" + user + "】的密码在LDAP中验证【不】通过。");
            return false;
        } 
        finally {
            if(ctx != null) {
                try { ctx.close(); } catch (NamingException e) { }
            }
        }
    }
    
    protected String getUserDN(String user) {
    	return user;
    }
}
