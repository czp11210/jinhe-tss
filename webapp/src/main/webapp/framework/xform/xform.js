var XFormCache = new Collection();

function $X(xformId, data) {
	var xform = XFormCache.get(xformId);

	if( xform == null && data == null ) {
		return null;
	}

	if( xform == null || data ) {
		xform = new XForm($$(xformId));
		xform.load(data);

		XFormCache.add(xform.element.id, xform);	
	}
	
	return xform;
}

var XForm = function(element) {
	this.id = element.id;
	this.element = element;
	this.form = element.firstChild;

	this.editable  = element.getAttribute("editable") || "true";
	this._baseurl  = element.getAttribute("baseurl") || "";
	this._iconPath = this._baseurl + "images/";

	this.columnInstanceMap = {};
}

XForm.prototype.load = function(data) {
	hideErrorInfo();

	if("object" != typeof(data) || data.nodeType != _XML_NODE_TYPE_ELEMENT) {
		alert("传入的XForm数据有问题，请检查。")	
	}
	
	this.template = new XFormTemplate(data);
	
	if(this.template && this.template._document) {
		// 修正comboedit类型默认第一项的值
		this.fixComboeditDefaultValue(this.template.dataRows);		
		
		this.element.innerHTML = this.parseTempalte(); // 把XML解析成Html

		// 绑定各个column对应的编辑方式
		this.attachEditor();
	
		// 绑定事件
		this.attachEvents();

		// 自动聚焦
		if(this.editable != "false") {
			this.setFocus();
		}		
	}
}

var XFormTemplate = function(data) {
	this._document = data;
 
	if( this._document ) {
		this.declare = this._document.selectSingleNode("./declare");
		this.layout  = this._document.selectSingleNode("./layout");
		this.script  = this._document.selectSingleNode("./script");
		this.columns = this._document.selectNodes("./declare/column");
		this.data    = this._document.selectSingleNode("./data");
		
		if(this.data == null) {				
			this.data = new XmlNode(getXmlDOM().createElement("data"));
			this._document.appendChild(this.data);
		}
		
		this.dataRows = this._document.selectSingleNode("./data/row[0]");
		if(this.dataRows == null) {
			this.dataRows = new XmlNode(getXmlDOM().createElement("row"));
			this.data.appendChild(this.dataRows);	
		}
		
		this.columnsMap = {};
		for(var i = 0; i < this.columns.length; i++) {
			var column = this.columns[i];
			this.columnsMap[column.getAttribute("name")] = column;
		}
	}
}

XForm.prototype.parseTempalte = function() {
	 var htmls = new Array();
	 var oThis = this;

	 htmls.push("<form class='xform' method='post' name='actionForm'>");
	 htmls.push("<div class='contentBox'>");
	 htmls.push('<table border="0" bordercolor="#D5E1F0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">');

	 for(var name in this.template.columnsMap) {
		var column = this.template.columnsMap[name];
		var hidden = column.getAttribute("hidden") == "true";
		if(hidden) {
			var value = this.getColumnValue(name);
			htmls.push('<input type="hidden" value="' + value + '" id="' + name + '"/>');
		}
	 }

	 var layoutTRs = this.template.layout.childNodes;
	 for(var i=0; i < layoutTRs.length; i++) {
		var trNode = layoutTRs[i];
		htmls.push("<tr>");

		var layoutTDs = trNode.childNodes;
		for(var j=0; j < layoutTDs.length; j++) {
			var tdNode = layoutTDs[j];
			htmls.push("<td "+ copyNodeAttribute(tdNode) +">");

			var childNodes = tdNode.childNodes;
			for(var n=0; n < childNodes.length; n++) {
				var childNode = childNodes[n];
				if(childNode.nodeType != _XML_NODE_TYPE_ELEMENT) {
					htmls.push(childNode.nodeValue);
					continue;
				}

				var nodeName = childNode.nodeName.toLowerCase();
				var binding = childNode.getAttribute("binding");

				var column = this.template.columnsMap[binding];
				if(column == null) {
					htmls.push(childNode.xml + "&nbsp;");
					continue;
				}

				var mode = column.getAttribute("mode");
				var editor = column.getAttribute("editor");
				var caption = column.getAttribute("caption");

				var type = childNode.getAttribute("type");
				
				if(nodeName == "label" && binding && binding != "") {
					htmls.push("<label id='label_" + binding + "' for= '" + binding + "'>" + caption + "</label>");
				}
				else if(mode == "string" && editor == 'comboedit') {
					htmls.push("<select " + copyNodeAttribute(childNode) + copyColumnAttribute(column) + copyColumnValue(binding) + "></select>");
				}
				else if(mode == "string" && nodeName == 'textarea') {
					htmls.push("<textarea " + copyNodeAttribute(childNode) + copyColumnAttribute(column) + ">" + this.getColumnValue(binding) + "</textarea>");
				}
				else if(mode == "string" || mode == "function") {
					htmls.push("<input " + copyNodeAttribute(childNode) + copyColumnAttribute(column) + copyColumnValue(binding) + "></input>");
				}
			}
			htmls.push("</td>");
		}	
		htmls.push("</tr>");
	 }

	 htmls.push("</table>");
	 htmls.push('<input type="hidden" name="xml" id="xml"/>');
	 htmls.push("</div>");
	 htmls.push("</form>");
	 return htmls.join("");

	 // some private function define
	 function copyColumnAttribute(column) {
		var returnVal = "";
		var attributes = column.attributes;
		for(var i = 0; i < attributes.length; i++) {
			var name = attributes[i].nodeName;
			var value = attributes[i].nodeValue;
			if(name == "editable") {
				value = oThis.editable || value;
			}
			returnVal += (name == "name" ? "id" : name) + "=\"" + value + "\"";
		}
		return returnVal;
	 }

	 function copyColumnValue(columnName) {
		var value = oThis.getColumnValue(columnName);
		return value ? "value=\"" + value + "\"" : "";
	 }

	 function copyNodeAttribute(node) {
		var returnVal = "";
		var hasBinding = node.getAttribute("binding") != null;
		var attributes = node.attributes;
		for(var i = 0; i < attributes.length; i++) {
			var attr = attributes[i];
			if(attr.nodeName != "style" || !hasBinding) {
				returnVal += attr.nodeName + "=\"" + attr.nodeValue + "\"";
			}
			if(attr.nodeName == "style" && hasBinding) {
				returnVal += "defaultStyle=\"" + attr.nodeValue + "\"";
			}
		}
		return returnVal;
	 }
}


XForm.prototype.attachEvents = function() {
	// 回车（keyCode == 13）自动聚焦下一个（input、button等）
	this.element.onkeydown = function() {
		var srcElement = event.srcElement;
		if(window.event.keyCode == 13 && srcElement.tagName.toLowerCase() != "textarea") {
			window.event.keyCode = 9;  // 相当于按了下Tab键，光标移动到下一个元素上
		}
	}
	
	this.element.onselectstart = function() {
		event.cancelBubble = true; // 拖动选择事件取消冒泡
	}

	if(this.form) {
		Event.attachEvent(this.form, "onsubmit", this.checkForm);
		Event.attachEvent(this.form, "onreset", this.resetForm);
	}
}

XForm.prototype.attachEditor = function() {
	var columnsMap = this.template.columnsMap;
	for(var colName in columnsMap) {
		var column = columnsMap[colName];

		// 取layout中绑定该column的元素，如果没有，则column无需展示。
		if($$(colName) == null) {
			continue;
		}

		var curInstance;
		var colMode   = column.getAttribute("mode");
		switch(colMode) {
			case "string":
				var colEditor = column.getAttribute("editor");
				if(colEditor == "comboedit") {
					curInstance = new Mode_ComboEdit(colName, this);
				}
				else {
					curInstance = new Mode_String(colName, this);
				}
				break;
			case "number":
				curInstance = new Mode_String(colName, this);
				break;
			case "function":
				curInstance = new Mode_Function(colName, this);
				break;
			case "hidden":
				curInstance = new Mode_Hidden(colName, this);
				break;
		}

		curInstance.saveAsDefaultValue();
		this.columnInstanceMap[colName] = curInstance;
	}
}

XForm.prototype.saveAsDefaultValue = function() {
	hideErrorInfo();

	for(var colName in this.columnInstanceMap) {
		var curInstance = this.columnInstanceMap[colName];
		curInstance.saveAsDefaultValue();    
	}
}

XForm.prototype.checkForm = function() {
	hideErrorInfo();

	if(this.template == null) return true;

	for(var colName in this.columnInstanceMap) {
		var curInstance = this.columnInstanceMap[colName];
		if( !curInstance.validate() ) {
			return false;
		}
	}

	$$("xml").value = this.template.data.xml;
	return true;
}

XForm.prototype.resetForm = function() {
	hideErrorInfo();

	for(var colName in this.columnInstanceMap) {
		var curInstance = this.columnInstanceMap[colName];
		curInstance.reset();
	}

	if(event) {
		event.returnValue = false;
	}
}

XForm.prototype.setEditable = function(status) {
	this.element.editable = status;

	var buttonBox = $$("buttonBox");
	if(buttonBox) {
		buttonBox.style.display = (status == "true" ? "block": "none");
	}

	for(var colName in this.columnInstanceMap) {		
		// 如果column上默认定义为不可编辑，则永远不可编辑
		var column = columnMap[name];
		if (column.getAttribute("editable") == "false") continue;

		var curInstance = this.columnInstanceMap[colName];
		curInstance.setEditable(status);
	}

	this.setFocus();
}

XForm.prototype.setFocus = function(name) {
	if( name == null || name == "") {
		var column = this.template.declare.selectSingleNode("column[(@editable='true' or not(@editable)) and (@display!='none')]");
		if(column == null) {
			return;
		}
		name = column.getAttribute("name");

		var curInstance = this.columnInstanceMap[name];
		if( curInstance ) {
			curInstance.setFocus();
		}
	}	
}

XForm.prototype.setColumnEditable = function(name, booleanValue) {
	var column = this.getColumn(name);
	column.setAttribute("editable", booleanValue);
	
	var curInstance = this.columnInstanceMap[name];
	curInstance.setEditable(booleanValue);
}

XForm.prototype.getColumn = function(name) {
	var column = this.template.columnsMap[name];
	if(column == null) {
		alert(name + "不存在");
	}
	return column;
}

XForm.prototype.getData = function(name, replace) {
	var nodeValue = this.getColumnValue(name);
	if(replace == true) {
		nodeValue = nodeValue.replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\'/g, "&#39;");
	}
	return nodeValue;
}

/* 获取row节点上与column对应的值 */
XForm.prototype.getColumnValue = function(name) {
	var rowNode = this.template.dataRows;
	var node = rowNode.selectSingleNode(name);
	var nodeValue = (node ? node.text : null);
	return nodeValue;
}

/*
 *  设置row节点上与column对应的值
 *  参数：  string:name             列名
			string/array:value      值
 */
XForm.prototype.setColumnValue = function(name, value) {
	var rowNode = this.template.dataRows;
	var node = rowNode.selectSingleNode(name);
	if( node == null ) { 
		node = getXmlDOM().createElement(name); // 创建单值节点
		rowNode.appendChild(new XmlNode(node));
	}

	var CDATANode = node.selectSingleNode("cdata()");
	if( CDATANode == null ) {
		CDATANode = getXmlDOM().createCDATASection(value);
		node.appendChild(newCDATANode);
	}
	else{
		CDATANode.text = value;
	}
}

XForm.prototype.reloadData = function(rowNode) {
	this.fixComboeditDefaultValue(rowNode);
	hideErrorInfo();

	var cols = this.template.columns;  // 以column定义为获取依据
	for(var i = 0; i < cols.length; i++) {
		var name  = cols[i].getAttribute("name");
		var value = rowNode.getAttribute(name) || "";
		this.updateDataExternal(name, value);
	}
}

// 修正comboedit类型默认第一项的值
XForm.prototype.fixComboeditDefaultValue = function(rowNode) {
	var cols = this.template.columns;
	for(var i = 0; i < cols.length; i++) {
		var name   = cols[i].getAttribute("name");
		var empty  = cols[i].getAttribute("empty");
		var editor = cols[i].getAttribute("editor");
		var editorValue = cols[i].getAttribute("editorvalue") || "";
		var firstValue = editorValue.split("|")[0];
		
		// 当empty = false(表示不允许为空)时，下拉列表的默认值自动取第一项值
		var value = this.getColumnValue(name);
		if((value == null || value.length == 0) && firstValue != "" && (editor=="comboedit" || editor=="radio") && empty=="false") {
			this.setColumnValue(name, firstValue);
		}
	}
}

// 将界面数据更新到XForm模板的data/row/里
XForm.prototype.updateData = function(obj) {
	if(event.propertyName == "checked") {
		var newValue = obj.checked == true ? 1 : 0;
	}
	else if(obj.tagName.toLowerCase() == "select") {
		var newValue = obj._value;            
	}
	else {
		var newValue = obj.value;
	}

	var oldValue = this.getColumnValue(obj.binding);
	if(newValue != oldValue && newValue && newValue != "") {
		this.setColumnValue(obj.binding, newValue);
	}
}

// 将数据设置到界面输入框上显示，同时更新到data/row/里
XForm.prototype.updateDataExternal = function(name, value) {
	this.setColumnValue(name, value);
	
	// 更改页面显示数据
	var colInstance = this.columnInstanceMap[name];
	if(colInstance) {
		colInstance.setValue(value);
	}
}

XForm.prototype.showCustomErrorInfo = function(name, str) {
	var instance = this.columnInstanceMap[name];
	if( instance ) {
		showErrorInfo(str, instance.obj);
	}
}

XForm.prototype.getColumnAttribute = function(name, attrName) {
	var column = this.template.columnsMap[name];
	if( column ) {
		return column.getAttribute(attrName);
	}
	else {
		return alert("指定的列[" + name + "]不存在");
	}
}

XForm.prototype.getXmlDocument = function() {
	return this.template._document;
}

XForm.prototype.xml = function() {
	return xmlDoc.toString();
}


// 定义各种类型的输入框

// 普通文本输入框
var Mode_String = function(colName, xform) {
	this.name = colName;
	this.obj = $$(colName);
	this.obj._value = this.obj.value; // 备份原值

	if(this.obj.getAttribute('empty') == "false") {
		this.obj.insertAdjacentHTML("afterEnd", "<span style='color:red;position:relative;left:3px;top:-2px'>*</span>");
	}

	this.setEditable();

	this.obj.onblur = this.onblur;
	this.obj.onpropertychange = this.onpropertychange;
}

Mode_String.prototype = {
	onpropertychange: function() {
		if(window.event.propertyName == "value") {
			if(this.inputReg != "null" && eval(this.inputReg).test(this.value) == false) { // 输入不符合
				restore(this, this._value);
			}
			else if(this.value.replace(/[^\u0000-\u00FF]/g, "**").length > parseInt(this.maxLength)) {
				restore(this, this.value.substringB(0, this.maxLength));
			}
			else{
				this._value = this.value;
			}
		}
	},

	onblur: function() {
		if("text" == this.type) {
			this.value = this.value.replace(/(^\s*)|(\s*$)/g, "");
		}

		if(this.value == "" && this.empty == "false") {
			showErrorInfo("请输入 [" + this.caption.replace(/\s/g, "") + "]", this);
		}
		else if(this.inputReg != "null" && eval(this.inputReg).test(this.value) == false){
			showErrorInfo("[" + this.caption.replace(/\s/g, "") + "] 格式不正确，请更正。", this);
		}
		else {
			xform.updateData(this);
		}
	},

	setValue : function(value) {
		this.obj._value = this.obj.value = value;
	},
	
	setEditable : function(status) {
		this.obj.editable = status || this.obj.getAttribute("editable");

		var disabled = (this.obj.editable == "false");
		this.obj.className = (disabled ? "string_disabled" : "string");

		if(this.obj.tagName == "TEXTAREA") {
			this.obj.readOnly = disabled;  // textarea 禁止状态无法滚动显示所有内容，所以改为只读
		} else {
			this.obj.disabled = disabled;        
		}
	},
	
	validate : function() {
		var empty = this.obj.empty;
		var errorInfo = this.obj.errorInfo;
		var caption = this.obj.caption.replace(/\s/g,"");
		
		var value = this.obj.value;
		if(value == "" && empty == "false") {
			errorInfo = "[" + caption.replace(/\s/g, "") + "] 不允许为空，请选择。";
		}

		var submitReg = this.obj.submitReg;
		if(submitReg != "null" && submitReg && !eval(submitReg).test(value)) {
			errorInfo = errorInfo || "[" + caption + "] 格式不正确，请更正.";
		}

		if( errorInfo != "null" && errorInfo ) {
			showErrorInfo(errorInfo, this.obj);

			if(this.isInstance != false) {
				if(this.setFocus) {
					this.setFocus();
				}
			}
			if( event ) {
				event.returnValue = false;
			}
			return false;
		}

		return true;
	},

	reset : function() {
		this.obj.value = this.obj.defaultValue;
	},

	saveAsDefaultValue : function() {
		this.obj.defaultValue = this.obj.value;
	},

	setFocus : function(){
		try {
			this.obj.focus();
		} catch(e){ }
	}
}


// 下拉选择框，单选或多选
function Mode_ComboEdit(colName, xform) {
	this.name = colName;
	this.obj = $$(colName);
 	this.obj._value = this.obj.attributes["value"].nodeValue;
	this.obj.disabled = (this.obj.getAttribute("editable") == "false");

	var selectedValues = {};
	var valueArr = this.obj._value.split(",");
	for(var i=0; i < valueArr.length; i++) {
		selectedValues[ valueArr[i] ] = true;
	}

	var valueList = this.obj.editorvalue.split('|');
	var textList  = this.obj.editortext.split('|');
	var selectedIndex = [];
	for(var i=0; i < valueList.length; i++){
		var value = valueList[i];
		var lable = textList[i];

		var option = new Option();
		option.value = value;
		option.text  = lable;
		if( selectedValues[value] ) {
			option.selected = true;
			selectedIndex[selectedIndex.length] = i;
		}
		this.obj.options[this.obj.options.length] = option;
	}
	if( selectedIndex.length > 0 ){
		this.obj.defaultSelectedIndex = selectedIndex.join(",");
	} 
	else {
		this.obj.defaultSelectedIndex = this.obj.selectedIndex = -1;
	}
	
	this.obj.onchange = function() {
		var x = [];
		for(var i=0; i < this.options.length; i++) {
			var option = this.options[i];
			if(option.selected) {
				x[x.length] = opt.value;
			}
		}
		this._value = x.join(",");
		xform.updateData(this);
	}
}

Mode_ComboEdit.prototype.setValue = function(value) {
	var valueList = {};
	var valueArray = value.split(",");
	for(var i = 0; i < valueArray.length; i++){
		valueList[valueArray[i]] = true;
	}

	var noSelected = true;
	for(var i=0; i < this.obj.options.length; i++){
		var opt = this.obj.options[i];
		if(valueList[opt.value]) {
			opt.selected = true;
			noSelected = false;
		}
	}

	if(noSelected){
		this.obj.selectedIndex = -1;	
	}
}

Mode_ComboEdit.prototype.setEditable = function(status) {
	this.obj.disabled  = (status == "true" ? false : true);
	this.obj.className = (status == "true" ? "comboedit" : "comboedit_disabled");
	this.obj.editable  = status;
}

Mode_ComboEdit.prototype.validate = function() {
	var empty = this.obj.getAttribute("empty");
	var value = this.obj.value;
	if(value == "" && empty == "false") {
		showErrorInfo("[" + this.obj.caption.replace(/\s/g, "") + "] 不允许为空，请选择。", this.obj);
		return false;
	}
	return true;
}

Mode_ComboEdit.prototype.reset = function() {
	this.obj.selectedIndex = -1;
	var selectedIndex = this.obj.defaultSelectedIndex;
	if(selectedIndex != "") {
		selectedIndex = selectedIndex.split(",");
		for(var i=0; i < selectedIndex.lengt; i++) {
			this.obj.options[selectedIndex[i]].selected = true;
		}
	}
}

Mode_ComboEdit.prototype.saveAsDefaultValue = function() {
	var selectedIndex = [];
	for(var i=0; i < this.obj.options.length; i++){
		var opt = this.obj.options[i];
		if(opt.selected) {
			selectedIndex[selectedIndex.length] = i;
		}
	}
	this.obj.defaultSelectedIndex = selectedIndex.join(",");
}

Mode_ComboEdit.prototype.setFocus = function() {
	try {
		this.obj.focus();
	} catch(e) {
	}
}



function Mode_Function(colName, xform) {
	Mode_String.call(this, element);
 
	this.obj.disabled  = (this.obj.getAttribute("editable") == "false");
	this.obj.className = (this.obj.disabled ? "function_disabled" : "function");

	if(this.obj.clickOnly != "false") { // 可通过column上clickOnly来控制是否允许可手工输入
		this.obj.readOnly = true;
	}

	var tempThis = this;
	waitingForVisible(function() {
		tempThis.obj.style.width = Math.max(1, tempThis.obj.offsetWidth - 20);
	}, tempThis.obj);

	if( !this.obj.disabled ) {
		var tempThisObj = this.obj;

		// 添加点击按钮
		this.obj.insertAdjacentHTML('afterEnd', '<button style="width:20px;height:18px;background-color:transparent;border:0px;"><img src="' + xform._iconPath + 'function.gif"></button>');
		var btObj = this.obj.nextSibling; // 动态添加进去的按钮
		btObj.onclick = function(){
			try {
				eval(tempThisObj.cmd);
			} catch(e) {
				showErrorInfo("运行自定义JavaScript代码<" + tempThisObj.cmd + ">出错，异常信息：" + e.description, tempThisObj);
				throw(e);
			}
		}
	}	
}

Mode_Function.prototype = Mode_String.prototype;

Mode_Function.prototype.setEditable = function(status) {
	this.obj.disabled  = (status == "false");
	this.obj.className = (this.obj.disabled ? "function_disabled" : "function");

	// function图标
	this.obj.nextSibling.disabled  = this.obj.disabled;
	this.obj.nextSibling.className = (this.obj.disabled ? "bt_disabled" : "");
	this.obj.editable = status;
}


function Mode_Hidden(colName, xform) {
	this.name = colName;
	this.obj = $$(colName);
}
Mode_Hidden.prototype.setValue = function(s) {}
Mode_Hidden.prototype.setEditable = function(s) {}
Mode_Hidden.prototype.validate = function() { return true; }
Mode_Hidden.prototype.reset = function() {}
Mode_Hidden.prototype.saveAsDefaultValue = function() {}
Mode_Hidden.prototype.setFocus = function() {}



function showErrorInfo(errorInfo, obj) {
	clearTimeout(200);
	
	setTimeout(function() {
		// 页面全局Balllon对象
		if( window.Balloons ) {
			var balloon = Balloons.create(errorInfo);
			balloon.dockTo(obj);
		}
	}, 100);
}

// 隐藏上次的错误信息层（即错误提示气泡）
function hideErrorInfo() {
	if( window.Balloons ) {
		Balloons.dispose();
	}
}

function restore(obj, value) {    
	var tempEvent = obj.onpropertychange;
	if( tempEvent == null ) {
		clearTimeout(obj.timeout);
		tempEvent = obj._onpropertychange;
	}
	else {
		obj._onpropertychange = tempEvent;
	}

	obj.onpropertychange = null;
	obj.timeout = setTimeout(function() {
		obj.value = value;
		obj.onpropertychange = tempEvent;
	}, 10);
}

function waitingForVisible(func, element) {
	// 控件未隐藏, 则直接执行
	if( 0 != element.offsetWidth ) {
		func();
		return;
	}

	// 控件隐藏, 则等待onresize
	var tasks = element.resizeTask || [];
	tasks[task.length] = func;
	element.resizeTask = tasks;

	if( element.onresize == null ) {
		element.onresize = function() {
			var tasks = element.resizeTask;
			for(var i=0; i < tasks.length; i++) {
				tasks[i]();
			}
			element.onresize = null;
		}
	}
}

function xformExtractData(xformNode, needPrefix) {
	if( xformNode ) {
		var dataNode = xformNode.selectSingleNode(".//data");

		var prefix = null;
		if(needPrefix) {
			prefix = xformNode.selectSingleNode("./declare").getAttribute("prefix");
		}
		
		return dataNode2Map(dataNode, prefix);
	}
	return null;
}

function dataNode2Map(dataNode, prefix) {
	var map = {};
	if(dataNode && dataNode.nodeName == "data") {
		var rename = dataNode.getAttribute("name");
		var nodes = dataNode.selectNodes("./row/*");
		for(var i = 0; i < nodes.length; i++) {
			var name = rename || nodes[i].nodeName; // 从data节点上获取保存名，如果没有则用原名
			
			// 前缀，xform declare节点上设置，以便于把值设置到action的bean对象里
			if( prefix ) {
				name = prefix + "." + name;
			}

			map[name] = nodes[i].text;
		}
	}
	return map;
}