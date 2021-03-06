package com.jinhe.dm.report;

import javax.servlet.http.HttpServletResponse;

import org.junit.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.jinhe.dm.DMConstants;
import com.jinhe.dm.TxTestSupport4DM;
import com.jinhe.tss.framework.component.param.ParamConstants;
import com.jinhe.tss.framework.component.param.ParamManager;
import com.jinhe.tss.framework.sso.context.Context;

public class DataServiceListTest extends TxTestSupport4DM {
    
    @Autowired private ReportAction action;
    @Autowired private _Reporter display;

    @Test
    public void test1() {  
    	String dsVal = "/tss/btr/orgs|分公司列表,/tss/btr/centers|分拨列表";
    	ParamManager.addSimpleParam(ParamConstants.DEFAULT_PARENT_ID, DMConstants.DATA_SERVICE_CONFIG, "特殊数据服务", dsVal);
    	
        HttpServletResponse response = Context.getResponse();
        
        Report report1 = new Report();
        report1.setType(Report.TYPE1);
        report1.setParentId(Report.DEFAULT_PARENT_ID);
        report1.setName("report-1");
        report1.setScript(" select id, name from dm_report where ${testMacro} and createTime > ? " +
        		" <#if param2 != '-1'> and 1=1 </#if> ");
        
        action.saveReport(response, report1);
        
        action.getDateServiceList(response);
    }
    
}