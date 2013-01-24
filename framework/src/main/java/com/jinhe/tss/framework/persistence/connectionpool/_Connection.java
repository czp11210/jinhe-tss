/* ==================================================================   
 * Created [2007-5-9] by Jon.King 
 * ==================================================================  
 * TSS 
 * ================================================================== 
 * mailTo:jinpujun@gmail.com
 * Copyright (c) Jon.King, 2012-2015 
 * ================================================================== 
 */
package com.jinhe.tss.framework.persistence.connectionpool;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;

import javax.sql.DataSource;

import org.apache.log4j.Logger;
import org.hibernate.cfg.Environment;
import org.hibernate.util.NamingHelper;

import com.jinhe.tss.util.ConfigurableContants;

/**
 * 管理数据库连接的provider，以及创建或释放掉连接.
 * 
 */
public class _Connection extends ConfigurableContants {

	protected final Logger log = Logger.getLogger(this.getClass());

	private IConnectionProvider provider;

	/**
	 * 如果配置的是数据源，则优先从数据源获取连接；否则手动创建一个连接。
	 */
	private _Connection() {
		if (properties.getProperty(Environment.DATASOURCE) != null) {
			provider = new DatasourceConnectionProvider();
		} else {
			provider = new DriverManagerConnectionProvider();
		}
	}

	private static _Connection _connection;

	public static _Connection getInstanse() {
		if (_connection == null) {
			_connection = new _Connection();
		}
		return _connection;
	}

	public Connection getConnection() {
		return provider.getConnection(properties);
	}

	public void releaseConnection(Connection conn) {
		if (conn != null) {
			try {
				conn.close();
			} catch (SQLException e) {
				log.fatal("销毁数据库连接时候出错", e);
				throw new RuntimeException("销毁数据库连接时候出错", e);
			}
		}
	}
 
	interface IConnectionProvider {
		Connection getConnection(Properties p);
	}

	/**
	 *  ## JNDI Datasource <br/>
	    #hibernate.connection.datasource jdbc/tss  <br/>
	    #hibernate.connection.username db2  <br/>
	    #hibernate.connection.password db2  <br/>
	 */
	class DatasourceConnectionProvider implements IConnectionProvider {
		public Connection getConnection(Properties p) {
			try {
				String jndiName = p.getProperty(Environment.DATASOURCE);
				DataSource ds = (DataSource) NamingHelper.getInitialContext(p).lookup(jndiName);
				if (ds == null) {
					throw new RuntimeException("Could not find datasource: " + jndiName);
				}

				String user = p.getProperty(Environment.USER);
				String pass = p.getProperty(Environment.PASS);

				return ds.getConnection(user, pass);
				
			} catch (Exception e) {
				log.fatal("从数据源获取连接时出错", e);
				throw new RuntimeException("从数据源获取连接时出错", e);
			}
		}
	}
 
	class DriverManagerConnectionProvider implements IConnectionProvider {
		public Connection getConnection(Properties p) {
			return DBHelper.getConnection(p);
		}
	}
}