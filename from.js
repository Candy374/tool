
function getHttpRequest(headers) {
    var http;
    if (window.XMLHttpRequest) {
        http = new XMLHttpRequest();
    } else {
        // code for IE6, IE5
        http = new ActiveXObject('Microsoft.XMLHTTP');
    }
    var result, pendingActions = [], errorActions = [], isReady = false;

    var readyFunction = function (data, actions, status) {
        isReady = true;
        var jsonData = '';
        try {
            jsonData = JSON.parse(data);
        } catch (e) {
            // do nothing;
        }
        result = {
            data,
            jsonData,
            status
        };

        if (actions.length > 0) {
            actions.forEach(function (action) {
                action(result);
            })
        }
    };

    var prepareListener = function (type, url, args) {
        http.onreadystatechange = function () {
            if (http.readyState == 4) {
                if (http.status == 200) {
                    readyFunction(http.responseText, pendingActions, http.status);
                } else {
                    readyFunction(http.responseText, errorActions, http.status);
                }
            }
        };
        args = args || {};
        var async = args.async === undefined ? true : args.async;
        http.open(type, url, async);
        if (headers) {
            headers.forEach(function (header) {
                for(var key in header) {
                    http.setRequestHeader(key, header[key]);
                }
            });
        }
    };

    http.get = function (url, args) {
        prepareListener('GET', url, args);
        http.send();
        return http;
    };

    http.post = function (url, data, args) {
        prepareListener('POST', url, args);
        http.send(data);
        return http;
    };

    var actionHandler = function (action, actionArray) {
        if (typeof action == 'function') {
            if (isReady) {
                action(result);
            } else {
                actionArray.push(action);
            }
        }
    };

    http.then = function (readyAction) {
        actionHandler(readyAction, pendingActions);
        return http;
    };

    http.error = function (errorAction) {
        actionHandler(errorAction, errorActions);
        return http;
    };

    return http;
}

function getQueryParamsMap(url, params) {
    var formParams = url.split('?')[1];
    if (formParams) {
        formParams = formParams.split('&');
        formParams.map(function (p) {
            if (!p) return;
            var kv = p.split('=');
            if (kv[1]) {
                params[kv[0]] = kv[1];
            }
        });
    }
}

function updateInput(form) {
    var inputs = form.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
        var dateInput = inputs[i];
        if ((dateInput.type === 'date' || dateInput.getAttribute('data-type') === 'date')
                && dateInput.placeholder) {
            dateInput.type = 'text';
		console.log('setting', this);
            dateInput.onblur = function () {
		    console.log('onblur', this)
                this.type = 'text';
            };
            dateInput.onfocus = function () {
		    console.log('onfocus', this)
                this.type = 'date';
            };
            dateInput['data-type'] = 'date';
        }
    }
}

var _clForm = function (){
	var formSetting;
    var needVerify = false;
    var callBack;
    var fillValue;
    var beforeSubmitForm;
    var onSubmit;
    var formUuid;
    var host;
    var isWechat;
    var pageUuid;
    var FORM;
    var VERSION;

    var chineseCities = [];


    function render(setting) {
        var content = JSON.parse(setting.content);
        VERSION = content.version;
        FORM = document.getElementById('clForm');
        FORM.setAttribute('method', 'POST');
        updateInput(FORM);

        if (!VERSION) {
            FORM.innerHTML = '';
            var fieldset = document.createElement('fieldset');
            fieldset.setAttribute('id', 'formFieldSet');

            var btn = document.createElement('button');
            btn.setAttribute('type', 'button');
            btn.setAttribute('id', 'clSubmitForm');
            //btn.setAttribute('data-cl-event', 'submit_form');
            //btn.setAttribute('data-cl-id', formUuid);
            //btn.setAttribute('data-cl-name', document.title);
            btn.textContent = content.btnText;

            var formType = FORM.dataset.formtype;

            content.fields.map(function (field) {
                var node;
                if (formType && formType == 'placeholder') {
                    node = addNoLabelField(field);
                }
                else {
                    node = addField(field);
                }
                fieldset.appendChild(node);
                if (field.type.toUpperCase() == 'PHONE' && field.needVerify) {
                    var column = document.createElement('div');
                    column.setAttribute('data-type', 'Code');
                    column.setAttribute('id', 'mobileVerifyRow');
                    if (FORM.dataset.formtype && FORM.dataset.formtype == 'placeholder') {
                        column.innerHTML = '<input name="code" type="text" placeholder="验证码" class="clFormTextField" />' +
                            '<button type="button" id="clGetCodeBtn">获取验证码</button>';
                    }
                    else {
                        column.innerHTML = '<label>验证码</label>' +
                            '<input name="code" type="text" class="clFormTextField" />' +
                            '<button type="button" id="clGetCodeBtn">获取验证码</button>';
                    }
                    fieldset.appendChild(column);
                    needVerify = true;
                }
            });

            FORM.appendChild(fieldset);
            var p = document.createElement('p');
            p.classList.add('submitButtonWrapper');
            p.appendChild(btn);
            FORM.appendChild(p);

            var css = document.createElement('style');
            css.type = 'text/css';
            css.appendChild(document.createTextNode(getStyle(content.style)));
            document.getElementsByTagName('head')[0].appendChild(css);

            var styleElement = document.createElement('style');
            styleElement.type = 'text/css';
            styleElement.appendChild(document.createTextNode('.cl-column:after{display: none;}'));
            document.getElementsByTagName('head')[0].appendChild(styleElement);
        }

        //省市联动
        renderProvinceAndCity();

        FORM.setAttribute('data-cl-attached', 'false');

        if (callBack) {
            callBack();
        }

        var codeBtn = document.getElementById('clGetCodeBtn');
        if (codeBtn) {
            needVerify = true;
            codeBtn.onclick = getCode;
        }
        var submitBtn = document.getElementById('clSubmitForm');
        if (submitBtn) {
            submitBtn.onclick = function () {
                beforeSubmit(content.fields);
            };
        }

        if (formSetting.autoFill && fillValue) {
            fillValue();
        }

        //是否限制同一用户重复提交表单
        if (setting.showLimitSubmit) {
            checkLimitSubmit();
        }
    }

    function validateRequired(formFields) {
        for (var i = 0; i < formFields.length; i++) {
            var field = formFields[i];
            var input = document.querySelector('#clForm [name="' + field.name + '"]');
            if (!input) {
                continue;
            }

            if (field.required) {
                if (input.type == 'checkbox' || input.type == 'radio') {
                    var checkboxes = document.querySelectorAll('#clForm [name="' + field.name + '"]');
                    var checked = false;
                    for (var k = 0; k < checkboxes.length; k++) {
                        if (checkboxes[k].checked) {
                            checked = true;
                        }
                    }
                    if (!checked) {
                        return field.label + '不能为空';
                    }
                }
                if (input.value == '') {
                    return field.label + '不能为空';
                }
            } else if (input.value == '') {
                continue;
            }

            if (input.type == 'number') {
                var low = field.low || null;
                var high = field.high || null;
                var max = 2000000000;
                if (field.low == 0) {
                    low = 0;
                }
                if (field.high == 0) {
                    high = 0;
                }
                if (low != null && input.value < low) {
                    return field.label + '不能小于' + low;
                }
                if (high != null && input.value > high) {
                    return field.label + '不能大于' + high;
                }
                if (input.value > max) {
                    return field.label + '不能大于2000000000';
                }
            } else if (input.type == 'date' || input["data-type"] == "date") {
                var _reDateReg = /^(?:19|20)[0-9][0-9]-(?:(?:0[1-9])|(?:1[0-2]))-(?:(?:[0-2][1-9])|(?:[1-3][0-1]))$/;

                if (!_reDateReg.test(input.value)) {
                    return '日期格式不正确，请输入格式为2016-01-01的日期';
                }
                var low = field.low || null;
                var high = field.high || null;
                if (low != null && input.value < low) {
                    return field.label + '不能早于' + low;
                }
                if (high != null && input.value > high) {
                    return field.label + '不能晚于' + high;
                }
            }
        }
        return null;
    }

    function checkLimitSubmit() {
        console.log('isWechat=' + isWechat);
        console.log('pageUuid=' + pageUuid);

        var http = getHttpRequest();
        //判断是否是微信环境
        if (isWechat && pageUuid) {
            http.get(host + '/pagedata/member?uuid=' + pageUuid);
        } else {
            var field = FORM.querySelector('input[name="cl_context"]');
            if (field) {
                var ctx = field.value.split('.');
                if (ctx.length >= 2) {
                    var utma = ctx[0] + '.' + ctx[1];
                    utma = utma.replace('utma=', '');
                    http.get(host + '/formdata/customer/' + utma + '?formUuid=' + formUuid);
                }
            }
        }

        http.then(function (result) {
            var customer = result.jsonData;
            if (customer && customer.id) {
                getHttpRequest().get(host + '/formdata/customerby?formUuid=' + formUuid + '&customerId=' + customer.id)
                    .then(function (result) {
                        var valueList = result.jsonData;
                        if (valueList.length > 0) {
                            var fieldset = document.getElementById('formFieldSet');
                            var submitBtn = document.getElementById('clSubmitForm');
                            var limitDiv = document.createElement('div');
                            limitDiv.setAttribute('style', 'text-align:center;margin-top:20px;font-size:13px;color:#ff7373;');
                            limitDiv.textContent = '对不起，该表单限填一次，请勿重复提交。';
                            if (fieldset) {
                                fieldset.insertBefore(limitDiv, fieldset.firstChild);
                            }
                            if (submitBtn) {
                                submitBtn.setAttribute('disabled', 'true');
                                submitBtn.setAttribute('style', 'background-color:#bdbdbd;cursor: not-allowed;border-color: #bdbdbd;');
                            }
                        }
                    });
            }
        });
    }

    function beforeSubmit(formFields) {
        var msg = validateRequired(formFields);
        if (msg != null) {
            alert(msg);
            return;
        }
        if (needVerify) {
            var mobile = document.querySelector('#clForm input[name="mobile"]').value;
            var code = document.querySelector('#clForm input[name="code"]').value;
            if (code) {
                getHttpRequest().get(formSetting.server + '/sms/verify?mobile=' + mobile + '&code=' + code).then(function (result) {
                    var data = result.jsonData;
                    if (data) {
                        submitForm(formFields);
                    } else {
                        alert('验证码不正确!');
                    }
                });
            } else {
                alert('请输入验证码!');
            }
        }
        else {
            submitForm(formFields);
        }

    }

    function submitForm(formFields) {
        if (beforeSubmitForm) {
            beforeSubmitForm();
        }

        var url = FORM.getAttribute('action');
        var params = {};
        getQueryParamsMap(url, params);
        getQueryParamsMap(location.href, params);

        var formParams = [];
        for (var p in params) {
            if (params[p]) {
                formParams.push(p + '=' + params[p]);
            }
        }
        if (formParams.length > 0) {
            url = url.split('?')[0] + '?' + formParams.join('&');
        }

        var arr = [];
        formFields.map(function (field) {
            arr.push(getFieldValue(field.name, field));
        });
        var hiddens = document.querySelectorAll('#clForm input[type=hidden]');
        var contextSet = false;
        for (var i = 0; i < hiddens.length; i++) {
            var f = hiddens[i];
            if (f.name == 'cl_context') {
                if (!contextSet) {
                    arr.push(f.value);
                    contextSet = true;
                }
            }
            else {
                arr.push(f.getAttribute('name') + '=' + f.value);
            }
        }
        arr.push('cltoken=' + formSetting.token);
        if (needVerify) {
            arr.push('mobileVerified=' + needVerify);
        }

        var str_data = arr.join('&');
        console.log(str_data);

        var xSubmit = getHttpRequest([{'Content-type': 'application/x-www-form-urlencoded'}]);
        xSubmit.post(url, str_data).then(function (result) {
            var data = result.data;
            if (onSubmit) {
                onSubmit(data);
            }
            var redirectType = formSetting.redirectType;
            if (redirectType == 'link') {
                var link = formSetting.redirectUrl;
                if (link.indexOf('append=true') > 0) {
                    link = link.replace('append=true', data)
                }
                setTimeout(function () {
                    self.location = link;
                }, 1000);
            }
            else if (redirectType == 'page') {
                setTimeout(function () {
                    self.location = host + '/page/' + formSetting.redirectUuid;
                }, 1000);
            }
            else {
                var text = formSetting.redirectText;

                var tempDiv = document.createElement('div');
                tempDiv.setAttribute('id', '_cl_messageArea');
                tempDiv.innerHTML = text;

                var anchor = document.createElement('a');
                anchor.setAttribute('name', '_cl_messageArea');

                var container = FORM.parentNode;
                container.innerHTML = '';
                container.appendChild(anchor);
                container.appendChild(tempDiv);
            }
        }).error(function (result) {
            if (result.status == 404) {
                if (result.data == 'LimitSubmit') {
                    alert('您已提交过该表单，请勿重复提交！');
                    return;
                }
            }
        });
    }

    function getFieldValue(name, field) {
        var nodes = document.getElementsByName(name);
        var val = [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var current = node;
            if (current.tagName == 'DIV') {
                continue;
            }
            while (node && !(node.tagName == 'FORM' && node.id == 'clForm')) {
                node = node.parentNode;
            }
            if (node) {
                if (current.type == 'radio') {
                    if (current.checked) {
                        if (name == 'gender') {
                            return name + '=' + current.value;
                        } else if (!field.isRating) {
                            // handle true/false
                            if (current.value == '1') {
                                return name + '=true';
                            }
                            else if (current.value == '0') {
                                return name + '=false';
                            }
                        }
                        return name + '=' + current.value;
                    }
                }
                else if (current.type == 'checkbox') {
                    if (current.checked) {
                        val.push(current.value);
                    }
                }
                else {
                    return name + '=' + current.value;
                }
                //break;
            }
        }
        return name + '=' + val.join('__');
    }

    function getCode() {
        var mobile = document.getElementById('clMobileField').value;
        if (mobile == null || mobile == '' || mobile.length < 11) {
            alert('手机号不正确');
            return;
        }
        var name;

        getHttpRequest().get(formSetting.server + '/sms/signature?uuid=' + formUuid).then(function (result) {
            name = result.data;
        }).error(function () {
            name = 'ConvertLab';
        }).then(function() {
            getHttpRequest().get(formSetting.server + '/sms/token?mobile=' + mobile).then(function (result) {
                var token = result.data;
                getHttpRequest().get(formSetting.server + '/sms/get?mobile=' + mobile + '&name=' + name + '&token=' + token + '&type=form&uuid=' + formUuid)
                    .then(function (result) {
                        var btnCode = document.getElementById('clGetCodeBtn');
                        btnCode.textContent = '60' + '秒后再获取';
                        btnCode.setAttribute('disabled', 'true');
                        var i = 59;
                        var intervalid;
                        intervalid = setInterval(function () {
                            btnCode.textContent = (i + '秒再获取');
                            if (i == 0) {
                                btnCode.textContent = ('获取验证码');
                                btnCode.removeAttribute('disabled');
                                clearInterval(intervalid);
                            }
                            i--;
                        }, 1000);
                    })
            });
        });
    }

    function renderProvinceAndCity() {
        if (!FORM) {
            return;
        }
        var province_field = FORM.querySelector('select[name=\'province\']');
        if (province_field) {
            if (chineseCities == null || chineseCities.length == 0) {
                getHttpRequest().get(host + '/ChineseCities.json', false).then(function (result) {
                    var data = result.jsonData;
                    chineseCities = data;
                    window.chinaAreas = data;

                    province_field.options.length = 0;
                    var opt = document.createElement('option');
                    opt.setAttribute('value', '');
                    opt.textContent = '请选择省份';
                    province_field.appendChild(opt);

                    for (var i = 0; i < chineseCities.length; i++) {
                        opt = document.createElement('option');
                        opt.setAttribute('value', chineseCities[i].name);
                        opt.textContent = chineseCities[i].name;
                        province_field.appendChild(opt);
                    }
                })
            }

            province_field.onchange = function (e) {
                var value = e.target.value;
                var input = document.querySelector('#clForm select[name="city"]');
                if (input) {
                    input.options.length = 0;
                    for (var i = 0; i < chineseCities.length; i++) {
                        if (value == chineseCities[i].name) {
                            var citys = chineseCities[i].city || [];
                            for (var j = 0; j < citys.length; j++) {
                                var city_opt = document.createElement('option');
                                city_opt.setAttribute('value', citys[j].name);
                                city_opt.textContent = citys[j].name;
                                input.appendChild(city_opt);
                            }
                            break;
                        }
                    }
                    if (input.options.length == 0) {
                        var opt = document.createElement('option');
                        opt.setAttribute('value', '');
                        opt.textContent = '请选择城市';
                        input.appendChild(opt);
                    }
                }
            };  //省份选择事件
        }

        var city_field = FORM.querySelector('select[name=\'city\']');
        if (city_field) {
            city_field.options.length = 0;
            var opt = document.createElement('option');
            opt.setAttribute('value', '');
            opt.textContent = '请选择城市';
            city_field.appendChild(opt);
        }
    }

    // for style
    function addNoLabelField(field) {
        var node = document.createElement('div');
        node.setAttribute('data-type', field.type);
        node.classList.add('cl-column');

        var sLabel = field.label || '';
        if (field.required) {
            sLabel += ' *';
        }
        var label;
        var input = null;
        var needToUpdate = false;
        switch (field.type.toUpperCase()) {
            case 'GENDER':
                label = document.createElement('label');
                label.textContent = sLabel;
                node.appendChild(label);
                input = document.createElement('span');
                input.innerHTML = '<input class="clFormRadioField"  type="radio" value="1" name="' + field.name + '">&nbsp;男</input>\
		    				  				   <input class="clFormRadioField"  type="radio" value="2" name="' + field.name + '" style="margin-left:10px;">&nbsp;女</input>';
                break;
            case 'BOOLEAN':
                label = document.createElement('label');
                label.textContent = sLabel;
                node.appendChild(label);
                input = document.createElement('span');
                input.innerHTML = '<input class="clFormRadioField"  type="radio" value="1" name="' + field.name + '">&nbsp;是</input>\
	    									   <input class="clFormRadioField"  type="radio" value="0" name="' + field.name + '" style="margin-left:10px;">&nbsp;否</input>';
                break;
            case 'DROPDOWN':
                input = document.createElement('select');
                input.classList.add('clFormSelectField');
                input.setAttribute('name', field.name);
                var opt = document.createElement('option');
                opt.setAttribute('value', '');
                opt.setAttribute('selected', true);
                opt.setAttribute('disabled', true);
                opt.textContent = sLabel;
                input.appendChild(opt);
                var options = field.options.split('\n');
                options.map(function (item) {
                    opt = document.createElement('option');
                    opt.setAttribute('value', item);
                    opt.textContent = item;
                    input.appendChild(opt);
                });
                if (field.required) {
                    input.setAttribute('required', true);
                }
                break;
            case 'CHECKBOX':
                label = document.createElement('label');
                label.textContent = sLabel;
                node.appendChild(label);
                input = document.createElement('div');
                input.classList.add('clFormCheckboxField');
                input.setAttribute('name', field.name);
                var options = field.options.split('\n');
                var str = '';
                options.map(function (item) {
                    str += '<p class="clFormOption"><input type="checkbox" name="' + field.name + '" value="' + item + '">' + item + '</p>';
                });
                input.innerHTML = str;
                if (field.required) {
                    input.setAttribute('required', true);
                }
                break;
            case 'RADIO':
                label = document.createElement('label');
                label.textContent = sLabel;
                node.appendChild(label);
                input = document.createElement('div');
                input.classList.add('clFormRadioField');
                input.setAttribute('name', field.name);
                var options = field.options.split('\n');
                var str = '';
                options.map(function (item) {
                    str += '<p class="clFormOption"><input type="radio" name="' + field.name + '" value="' + item + '">' + item + '</p>';
                });
                input.innerHTML = str;
                if (field.required) {
                    input.setAttribute('required', true);
                }
                break;
            case 'EMAIL':
                input = document.createElement('input');
                input.setAttribute('type', 'email');
                input.classList.add('clFormEmailField');
                input.setAttribute('name', field.name);
                input.setAttribute('placeholder', sLabel);
                break;
            case 'PHONE':
                input = document.createElement('input');
                input.setAttribute('type', 'tel');
                input.classList.add('clFormPhoneField');
                input.setAttribute('name', field.name);
                input.setAttribute('id', 'clMobileField');
                input.setAttribute('placeholder', sLabel);
                break;
            case 'DATE':
                input = document.createElement('input');
                input.setAttribute('type', 'date');
                input.classList.add('clFormDateField');
                input.setAttribute('name', field.name);
                var low = field.low || null;
                var high = field.high || null;
                var sRange = '';
                if (low != null && high != null) {
                    sRange = '从' + low + '到' + high;
                }
                else if (low != null) {
                    sRange = '不早于' + low;
                }
                else if (high != null) {
                    sRange = '不晚于' + high;
                }
                input.placeholder = sLabel + ': ' + sRange;
                needToUpdate = true;
                break;
            case 'NUMBER':
            case 'MONEY':
                input = document.createElement('input');
                input.setAttribute('type', 'number');
                input.classList.add('clFormNumberField');
                input.setAttribute('name', field.name);
                var low = field.low || null;
                var high = field.high || null;
                var sRange = '';
                if (field.low == 0) {
                    low = 0;
                }
                if (field.high == 0) {
                    high = 0;
                }
                if (low != null && high != null) {
                    sRange = '从' + low + '到' + high;
                }
                else if (low != null) {
                    sRange = '不小于' + low;
                }
                else if (high != null) {
                    sRange = '不大于' + high;
                }
                input.placeholder = sLabel + ': ' + sRange;
                break;
            default:
                if (field.multipleLine) {
                    input = document.createElement('textarea');
                }
                else {
                    input = document.createElement('input');
                }
                input.classList.add('clFormTextField');
                input.setAttribute('type', 'text');
                input.setAttribute('name', field.name);
                input.placeholder = sLabel;
                break;
        }
        if (needToUpdate) {
            var str = input.getAttribute('placeholder') || '';
            input.onfocus = function () {
                this.removeAttribute('placeholder');
            };
            input.onblur = function () {
                if (this.value == '') this.setAttribute('placeholder', str);
            };
        }
        node.appendChild(input);
        return node;
    }

    // for style
    function addField(field) {
        var node = document.createElement('div');
        node.setAttribute('data-type', field.type);
        var label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) {
            var span = document.createElement('span');
            span.classList.add('cl-required');
            span.textContent = '*';
            label.appendChild(span);
        }
        node.appendChild(label);
        if (field.description && field.description != '') {
            var descP = document.createElement('p');
            descP.classList.add('clFormDescription');
            descP.textContent = field.description;
            node.appendChild(descP);
        }
        var input = null;
        switch (field.type.toUpperCase()) {
            case 'GENDER':
                input = document.createElement('span');
                input.innerHTML = '<input class="clFormRadioField"  type="radio" value="1" name="' + field.name + '">&nbsp;男</input>\
		    				  				   <input class="clFormRadioField"  type="radio" value="2" name="' + field.name + '" style="margin-left:10px;">&nbsp;女</input>';
                break;
            case 'BOOLEAN':
                input = document.createElement('span');
                input.innerHTML = '<input class="clFormRadioField"  type="radio" value="1" name="' + field.name + '">&nbsp;是</input>\
	    									   <input class="clFormRadioField"  type="radio" value="0" name="' + field.name + '" style="margin-left:10px;">&nbsp;否</input>';
                break;
            case 'DROPDOWN':
                input = document.createElement('select');
                input.classList.add('clFormSelectField');
                input.setAttribute('name', field.name);
                var options = field.options.split('\n');
                options.map(function (item) {
                    var opt = document.createElement('option');
                    opt.setAttribute('value', item);
                    opt.textContent = item;
                    input.appendChild(opt);
                });
                break;
            case 'CHECKBOX':
                input = document.createElement('div');
                input.classList.add('clFormCheckboxField');
                input.setAttribute('name', field.name);
                var options = field.options.split('\n');
                var str = '';
                options.map(function (item) {
                    str += '<p class="clFormOption"><input type="checkbox" name="' + field.name + '" value="' + item + '">' + item + '</p>';
                });
                input.innerHTML = str;
                if (field.required) {
                    input.setAttribute('required', true);
                }
                break;
            case 'RADIO':
                input = document.createElement('div');
                input.classList.add('clFormRadioField');
                input.setAttribute('name', field.name);
                var options = field.options.split('\n');
                var str = '';
                var isFirst = true;
                options.map(function (item) {
                    if (isFirst) {
                        str += '<p class="clFormOption"><input type="radio" name="' + field.name + '" value="' + item + '">' + item + '</p>';
                        isFirst = false;
                    }
                    else {
                        str += '<p class="clFormOption"><input type="radio" name="' + field.name + '" value="' + item + '">' + item + '</p>';
                    }
                });
                input.innerHTML = str;
                if (field.required) {
                    input.setAttribute('required', true);
                }
                break;
            case 'EMAIL':
                input = document.createElement('input');
                input.setAttribute('type', 'email');
                input.classList.add('clFormEmailField');
                input.setAttribute('name', field.name);
                break;
            case 'PHONE':
                input = document.createElement('input');
                input.setAttribute('type', 'tel');
                input.classList.add('clFormPhoneField');
                input.setAttribute('name', field.name);
                input.setAttribute('id', 'clMobileField');
                break;
            case 'DATE':
                input = document.createElement('input');
                input.setAttribute('type', 'date');
                input.classList.add('clFormDateField');
                input.setAttribute('name', field.name);
                var low = field.low || null;
                var high = field.high || null;
                if (low != null) {
                    input.dataset['low'] = low;
                }
                if (high != null) {
                    input.dataset['high'] = high;
                }
                if (low != null && high != null) {
                    input.placeholder = '从' + low + '到' + high;
                }
                else if (low != null) {
                    input.placeholder = '不早于' + low;
                }
                else if (high != null) {
                    input.placeholder = '不晚于' + high;
                }
                break;
            case 'NUMBER':
            case 'MONEY':
                input = document.createElement('input');
                input.setAttribute('type', 'number');
                input.classList.add('clFormNumberField');
                input.setAttribute('name', field.name);
                var low = field.low || null;
                var high = field.high || null;
                if (field.low == 0) {
                    low = 0;
                }
                if (field.high == 0) {
                    high = 0;
                }
                if (low != null) {
                    input.dataset['low'] = low;
                }
                if (high != null) {
                    input.dataset['high'] = high;
                }
                if (low != null && high != null) {
                    input.placeholder = '从' + low + '到' + high;
                }
                else if (low != null) {
                    input.placeholder = '不小于' + low;
                }
                else if (high != null) {
                    input.placeholder = '不大于' + high;
                }
                break;
            default:
                if (field.multipleLine) {
                    input = document.createElement('textarea');
                }
                else {
                    input = document.createElement('input');
                }
                input.classList.add('clFormTextField');
                input.setAttribute('type', 'text');
                input.setAttribute('name', field.name);
                break;
        }
        if (field.required) {
            input.setAttribute('required', true);
        }
        node.appendChild(input);
        return node;
    }

    // for style
    function getDefaultStyle() {
        return 'form label{display:block;font-family:Microsoft YaHei,Helvetica;font-size:1.1em;font-weight:bold;color:#676a6c;}form .clFormDescription{font-family:Microsoft YaHei;font-size:1.1em;font-weight:normal;color:#676a6c;}form .clFormOption{font-family:Microsoft YaHei;font-size:1.1em;font-weight:normal;color:#676a6c;}form label{margin-top:10px;}#mobileVerifyRow{position:relative;}fieldset{border-width:0px;max-width:300px;display:block;margin-left:auto;margin-right:auto;}.clFormTextField, .clFormNumberField, .clFormDateField, .clFormPhoneField, .clFormEmailField, .clFormSelectField{width:100%;min-height:32px;height:32px;border-style:solid;border-width:1px;border-color:#cccccc;}#clGetCodeBtn{position:absolute;right:0px;height:32px;line-height:32px;border-width:0px;bottom:0px;background-color:lightsteelblue;}.clFormSelectField{font-size:15px;}.submitButtonWrapper{text-align:center;}#clSubmitForm{margin-top:10px;background-color:#007aff;border-width:px;border-color:#007aff;font-family:Microsoft YaHei;font-size:1.1em;color:#ffffff;font-weight:normal;}input{padding: 0px;box-sizing: border-box;}.cl-column:after{display: none;}';
    }

    // for style
    function getStyle(style) {
        if (!style) {
            return getDefaultStyle();
        }
        var aStyle = [];
        aStyle.push('form label{display:block;');
        aStyle.push('font-family:' + style.label.fontFamily + ',Helvetica;');
        if (style.label.fontSize == 'large') {
            aStyle.push('font-size:18px;');
        }
        else if (style.label.fontSize == 'small') {
            aStyle.push('font-size:14px;');
        }
        else {
            aStyle.push('font-size:16px;');
        }
        if (style.label.bold) {
            aStyle.push('font-weight:bold;');
        }
        else {
            aStyle.push('font-weight:normal;');
        }
        aStyle.push('color:' + style.label.color + ';}');

        aStyle.push('form .clFormDescription{-webkit-margin-before:0px;-webkit-margin-after:0px;');
        aStyle.push('font-family:' + style.description.fontFamily + ',Helvetica;');
        if (style.description.fontSize == 'large') {
            aStyle.push('font-size:16px;');
        }
        else if (style.description.fontSize == 'small') {
            aStyle.push('font-size:12px;');
        }
        else {
            aStyle.push('font-size:14px;');
        }
        if (style.description.bold) {
            aStyle.push('font-weight:bold;');
        }
        else {
            aStyle.push('font-weight:normal;');
        }
        aStyle.push('color:' + style.description.color + ';}');

        aStyle.push('form .clFormOption{');
        aStyle.push('font-family:' + style.option.fontFamily + ',Helvetica;');
        if (style.option.fontSize == 'large') {
            aStyle.push('font-size:17px;');
        }
        else if (style.option.fontSize == 'small') {
            aStyle.push('font-size:12px;');
        }
        else {
            aStyle.push('font-size:14px;');
        }
        if (style.option.bold) {
            aStyle.push('font-weight:bold;');
        }
        else {
            aStyle.push('font-weight:normal;');
        }
        aStyle.push('color:' + style.option.color + ';}');

        if (style.lingHeight == 'small') {
            aStyle.push('form label{margin-top:25px;margin-bottom:5px;}');
            aStyle.push('form .clFormDescription{margin-top:5px;margin-bottom:10px;}');
        }
        else if (style.lingHeight == 'large') {
            aStyle.push('form label{margin-top:45px;margin-bottom:10px;}');
            aStyle.push('form .clFormDescription{margin-top:-10px;margin-bottom:5px;}');
        }
        else {
            aStyle.push('form label{margin-top:25px;margin-bottom:10px;}');
            aStyle.push('form .clFormDescription{margin-top:-10px;margin-bottom:10px;}');
        }

        aStyle.push('form span.cl-required{color:#ff5a54;margin-left:10px;}');

        aStyle.push('.cl-column{position:relative;}');
        aStyle.push('.cl-column:after{position:absolute;z-index:9999;height:100%;width:100%;top:0px;left:0px;content:\'\';}');
        aStyle.push('fieldset{border-width:0px;}');
        aStyle.push('#clForm{border-width:0px;max-width:300px;display:block;margin-left:auto;margin-right:auto;}');

        aStyle.push('.clFormTextField, .clFormNumberField, .clFormDateField, .clFormPhoneField, .clFormEmailField, .clFormSelectField{');
        aStyle.push('-webkit-appearance:none;width:100%;min-height:32px;height:32px;border-style:solid;padding:0px 5px;color:#777777;background-color:#f3f5f7;font-size:15px;');
        if (style.field.radius == 'on') {
            aStyle.push('border-radius:2px;');
        }
        //aStyle.push("border-width:"+style.field.size+"px;");
        aStyle.push('border-width:' + '0px;');
        aStyle.push('border-color:' + style.field.color + ';border-top:1px solid #e4e9ec}');

        aStyle.push('.clFormTextField:focus, .clFormNumberField:focus, .clFormDateField:focus, .clFormPhoneField:focus, .clFormEmailField:focus, .clFormSelectField:focus{border:1px solid #2EB2ED;}');

        aStyle.push('.clFormSelectField{background: url("http://host.convertlab.cn/img/iso_select_arrow.png") no-repeat scroll right center #f3f5f7;}');
        aStyle.push('.clFormDateField{background: url("http://host.convertlab.cn/img/iso_date_icon.png") no-repeat scroll right center #f3f5f7;}');

        aStyle.push('.clFormOption input{height:16px;width:16px;margin-right:10px;vertical-align:middle;box-shadow: 0px 1px 3px #e1e1e1;}');
        aStyle.push('.clFormOption{margin-top:5px;margin-bottom:5px;}');

        aStyle.push('#mobileVerifyRow{position:relative;}#clGetCodeBtn{position:absolute;right:0px;height:32px;line-height:32px;border-width:0px;bottom:0px;background-color:#2eb2ed;font-size:15px;}');
        aStyle.push('#clSubmitForm{');
        aStyle.push('margin-top:10px;font-size:14px;');
        if (style.button.shadow == 'on') {
            aStyle.push('box-shadow: 0px 1px 3px #b3b2b2;');
        }
        aStyle.push('background-color:' + style.button.color + ';');
        if (style.button.borderRadius == 'on') {
            aStyle.push('border-radius:2px;');
        }
        aStyle.push('border-width:' + style.button.borderSize + 'px;');
        aStyle.push('border-color:' + style.button.borderColor + ';');
        aStyle.push('font-family:' + style.button.textFont + ';');
        if (style.button.textSize == 'large') {
            aStyle.push('font-size:17px;');
        }
        else if (style.button.textSize == 'small') {
            aStyle.push('font-size:13px;');
        }
        else {
            aStyle.push('font-size:15px;');
        }
        if (style.button.size == 'small') {
            aStyle.push('padding:5px 10px;');
        }
        else if (style.button.size == 'large') {
            aStyle.push('padding:5px;width:100%;');
        }
        else {
            aStyle.push('width:150px;height:32px;');
        }
        if (style.button.borderRadius == 'on') {
            aStyle.push('border-radius: 5px;');
        }
        else {
            aStyle.push('border-radius: 0px;');
        }
        aStyle.push('color:' + style.button.textColor + ';');
        if (style.button.textBold) {
            aStyle.push('font-weight:bold;');
        }
        else {
            aStyle.push('font-weight:normal;');
        }
        aStyle.push('}');
        aStyle.push('#clGetCodeBtn{');
        aStyle.push('color:' + style.button.textColor + ';');
        aStyle.push('background-color:' + style.button.color + ';');
        if (style.button.textBold) {
            aStyle.push('font-weight:bold;');
        }
        else {
            aStyle.push('font-weight:normal;');
        }
        aStyle.push('}');
        aStyle.push('form{padding-bottom:20px;}');
        aStyle.push('.submitButtonWrapper{text-align:' + style.button.layout + ';}');
        aStyle.push('input{padding: 0px;box-sizing: border-box;}');
        aStyle.push('.cl-column:after{display: none;}');
        return aStyle.join('');
    }

    return {
        loadForm: function (server, formName, events, args) {
            callBack = events.formInit;
            beforeSubmitForm = events.beforeSubmit;
            onSubmit = events.onSubmit;
            fillValue = events.fillData;
            formUuid = formName;
            host = server;

            if (args) {
                isWechat = args.isWechat || false;
                pageUuid = args.pageUuid;
            }

            getHttpRequest().get(server + '/formdata/get/' + formName).then(function (result) {
                var setting = result.jsonData;
                formSetting = setting;
                render(setting);
            });
        }
    }
}();
