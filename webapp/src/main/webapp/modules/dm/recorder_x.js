// ------------------------------------------------- 自定义扩展 ------------------------------------------------
/*
 *  多级下拉选择联动，录入表单和查询表单都使用本方法
 *
 *  参数： nextL    下一级联动参数的序号
        serviceID       下一级联动的service地址             
        currParam       当前联动参数的序号
        currParamValue  当前联动参数的值

    eg: getNextLevelOption(^center^, ^../../api/json/GetFenBo^, ^param1^)  // 数据服务接收参数名为param1
        getNextLevelOption(^center^, ^../../service/centers^, ^org^)      // 数据服务接收参数名为org
 */
function getNextLevelOption(nextL, serviceID, currParam, currParamValue) {
    if( !nextL || !serviceID || !currParam || $.isNullOrEmpty(currParamValue)) return;

    var dreg = /^[1-9]+[0-9]*]*$/, xform;

    nextL = dreg.test(nextL) ? "f" + nextL : nextL;
    if( $("#" + nextL).length == 0 ) return; 

    // serviceID maybe is ID of record, maybe a serviceUrl
    var url = dreg.test(serviceID) ? '../../data/json/' + serviceID : serviceID;
    
    if( currParam.indexOf('p_') >= 0 || url.indexOf('p_') >= 0) { // 查询表单的级联下拉
        currParam = currParam.replace('p_', '')
        url = url.replace('p_', '');
        xform = $.F("searchForm");
    } 
    else {
        xform = $.F("page1Form");
    }

    if( dreg.test(currParam) ) { // 数字
        currParam = "param" + currParam;
    }
    
    $.getNextLevelOption(xform, currParam, currParamValue, url, nextL);
}

/* nextLevel("season", "month", 
 *   {"春":"三月|四月|五月", "夏":"六月|七月|八月", "秋":"九月|十月|十一月", "冬":"十二月|一月|二月"});
 */
function nextLevel(current, next, map) {
    var currentVal = $("#" + current).value();
    var nextOpts = map[currentVal];
    if(!nextOpts) {
        return;
    }

    var xform = $.F("page1Form");
    xform.updateField(next, [
        {"name": "texts", "value": nextOpts},
        {"name": "values", "value": nextOpts}
     ]);
}

function batchOp(field, value) {
    var ids = $.G("grid").getCheckedRows();
    if(!ids) {
        return alert("你没有选中任何记录，请勾选后再进行批量操作。");
    }
    $.ajax({
        url: URL_BATCH_OPERATE + recordId,
        params: {"ids": ids, "field": field, "value": value},
        onsuccess: function() { 
            loadGridData( $1("GridPageList").value || 1 ); // 更新Grid
        }
    });
}

// addOptBtn('批量及格', function() { batchOp("score", "及格") });  
function addOptBtn(name, fn, roleId, group) {
    if( roleId && !userRoles.contains(roleId) ) return;

    if(group && userGroups && userGroups.length) {
        var g = userGroups[userGroups.length - 1];
        if(group != g[0] && group != g[1]) {
            return;
        }
    }

    var batchOpBtn = $.createElement('button', 'btStrongL');
    $(batchOpBtn).html(name).click( fn );  
    $('#customizeBox').appendChild(batchOpBtn);
}

// batchOpt('批量及格', "score", "及格");
function batchOpt(name, field, value, roleId, group) {
    addOptBtn(name, function() { batchOp(field, value) }, roleId, group);  
}

// 依据用户的角色和组织判断用户是否能对指定字段可编辑
function forbid(field, role, group) {
    var xform = $.F("page1Form");
    var editable = false;
    if(role) {
        editable = userRoles.contains(role);
    } 
    if(group) {
        if(userGroups && userGroups.length) {
            var g = userGroups[userGroups.length - 1];
            if(group == g[0] || group == g[1]) {
                editable = true;
            }
        }
    }  

    if(!editable) {
        var fields = field.split(",");
        fields.each(function(i, _field) {
            xform.setFieldEditable(_field, "false"); 
        });
    }
}

function calculateSum(totalField, fields) {
    var xform = $.F("page1Form");
    forbid(totalField); 
    fields.each(function(i, field){
        $("#" + field).blur(function(){
            var value = 0;
            fields.each(function(j, f){
                value += getFloatValue(f);
            });
            xform.updateDataExternal(totalField, value);    
            xform.updateData(this);
        });
    });
}

function getFloatValue(field) {
    return parseFloat($("#" + field).value() || '0');
}

// onlyOne(["udf1", "udf2", "udf3"]);
function onlyOne( fields ) {
    var xform = $.F("page1Form"); 
    fields.each(function(i, field){  
        $("#" + field).blur(function(){
            var value = this.value;
            
            fields.each(function(j, f){ 
                if(field !== f) {
                    xform.setFieldEditable(f, !value ? "true" : "false");   
                }
            });

            xform.updateData(this);
        });

        var tempV = $("#" + field).value(); 
        if(tempV) {
            fields.each(function(j, f){
                if(field !== f) {
                    setTimeout(function() {
                        xform.setFieldEditable(f, "false"); 
                    }, 50*j);
                }
            });
        }
    });
}

function notice(field, msg) {
    $("#" + field).click(function(){  
        $(this).notice(msg); 
    });
}

// if($("#udf1").value() === "11") { disableForm(); } else { $("#page1BtSave").show();  };
function disableForm() {
    $("#page1BtSave").hide(); 
    $.F("page1Form").setEditable("false");
}

function updateField(code, value) {
    var xform = $.F("page1Form");
    xform.updateDataExternal(code, value);    
    xform.updateData( $1(code) );
}