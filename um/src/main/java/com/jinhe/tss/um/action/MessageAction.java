package com.jinhe.tss.um.action;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.jinhe.tss.framework.web.dispaly.grid.GridDataEncoder;
import com.jinhe.tss.framework.web.dispaly.tree.LevelTreeParser;
import com.jinhe.tss.framework.web.dispaly.tree.TreeEncoder;
import com.jinhe.tss.framework.web.dispaly.xform.XFormEncoder;
import com.jinhe.tss.framework.web.dispaly.xform.XFormTemplet;
import com.jinhe.tss.framework.web.mvc.BaseActionSupport;
import com.jinhe.tss.um.entity.Message;
import com.jinhe.tss.um.helper.UMQueryCondition;
import com.jinhe.tss.um.service.IMessageService;
 
@Controller
@RequestMapping("message")
public class MessageAction extends BaseActionSupport {

	private static final String XFORM_URI       = "template/xform/message.xml";
	private static final String GRID_URI        = "template/grid/messageGrid.xml";
	private static final String USER_GRID_URI   = "template/grid/userGrid.xml";
	private static final String SEARCH_USER_URI = "template/xform/searchUser.xml";
	
	@Autowired private IMessageService service;
	
	
	@RequestMapping(method = RequestMethod.PUT)
	public void sendMessage(Message message) {
		service.sendMessage(message);
		printSuccessMessage("发送成功!");
	}
	
	@RequestMapping("/{id}")
	public void viewMessage(@PathVariable("id") Long id) {
		XFormEncoder messagerEncoder = new XFormEncoder(XFORM_URI, service.viewMessage(id));
		print("MessageInfo", messagerEncoder);
	}
	
    @RequestMapping("/reply/{id}")
    public void getMessage4Reply(@PathVariable("id") Long id) {
        Message message = service.viewMessage(id);
        Message newMessage = new Message();
        newMessage.setReceiverId(message.getSenderId());
        newMessage.setReceiver(message.getSender());
        newMessage.setTitle("Re: " + message.getTitle());
        message = newMessage;

        XFormEncoder messagerEncoder = new XFormEncoder(XFORM_URI, message);
        print("ReplyInfo", messagerEncoder);
    }
	
	@RequestMapping(value = "/{id}", method = RequestMethod.DELETE)
	public void deleteMessage(@PathVariable("id") Long id) {
		service.deleteMessage(id);
		printSuccessMessage("删除成功!");
	}
	
	public void getSearchUserInfo() {
		GridDataEncoder encoder = new GridDataEncoder(null, USER_GRID_URI);
		XFormTemplet template = new XFormTemplet(SEARCH_USER_URI);
	    print(new String[]{"SearchUser", "ExistUserList"}, 
		        new Object[]{template.getTemplet().asXML(), encoder});
	}
	
	public void getGroupTree(){
		List<?> groups = service.getGroupsList();
		TreeEncoder encoder = new TreeEncoder(groups, new LevelTreeParser());
		encoder.setNeedRootNode(false);
		print("GroupTree", encoder);
	}
	
	public void searchUsers(UMQueryCondition condition) {
		List<?> users = service.getUsersByCondition(condition);
		GridDataEncoder encoder = new GridDataEncoder(users, USER_GRID_URI);
		print("SourceList", encoder);
	}
	
	public void getMessageList(int boxType) {
		List<?> messages = null;
		// 信箱類型，分收件箱、發件箱
		switch (boxType) {
    		case 1:	break;
    		case 2:	messages = service.getInboxList(); break;
    		case 4: messages = service.getOutboxList(); break;
    		default: break;
		}
		
		print("MessageList", new GridDataEncoder(messages, GRID_URI));
	}
}
