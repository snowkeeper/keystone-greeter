var keystone = require('keystone'),
	_ = require('lodash'),
	express = require('express'),
	fs = require('fs'),
	path = require('path'),
	async = require('async'),
	jade = require('jade'),
	sanitizer=require('sanitizer'),
	config = require('./lib/config.js'),
	debug = require('debug')('greeter'),
	i18n = require("i18n"),
	Text = i18n.__,
	yes = 'yes', /* true === 'yes' - isTrue === true;  >> will fail; use isTrue === yes*/
	no = 'no' /* false === 'no'  - isTrue === no;  >> for truely false */;

i18n.configure({
	locales:['en'],
	directory: __dirname + '/locales'
});
	
var templateCache = {};
/**
 * grabs the true app root
 */
var appRoot = (function(_rootPath) {
	var parts = _rootPath.split(path.sep);
	parts.pop(); // rid of /node_modules
	return parts.join(path.sep);
})(module.parent ? module.parent.paths[0] : module.paths[0]);


var SnowGreeter = function() {
	
	this._options = {}
	/* set the module variables
	 * */	
	this.set('user model',keystone.get('user model') || 'User');
	
	this.set('defaults', true);
	
	this.set('allow register',true);
	this.set('new user can admin',false);
	this.set('2FA',false);
	this.set('social',false);
	this.set('register security',true);
	
	this.set('route greeter',keystone.get('signin url') || '/greeter');
	this.set('route relay', '/greeter-keystone-relay');
	this.set('route reset', '/greeter-reset-password');
	
	this.set('redirect timer',0);
	
	this.set('greeter style',true);
	this.set('keystone style',true);
	
	this.resetField('all');
	
	this.setButton({
		login: Text('login'),
		logincurrent: Text('current user?'),
		register: Text('register new account'),
		reset: Text('reset your password'),
		resetpass: Text('send reset email'),
	});
	
	this.setMessage('register header', Text('register new account'));
	this.setMessage('login header', Text('welcome back'));
	this.setMessage('reset header', Text('reset your password'));
	this.setMessage('valid credentials', Text('a valid username and password are required'));
	this.setMessage('welcome', Text('Welcome back %s','{user}.'));
	this.setMessage('welcome login', Text('Welcome back.  Please signin'));
	this.setMessage('registration closed', Text('registration is currently closed'));
	this.setMessage('current user', Text('You are currently signed in.  Do you want to <a href="/keystone/signout">sign out</a>? '));
	this.setMessage('bad token', Text('bad request token. %s',' <a href="javascript:location.reload()">refresh</a>'));
	this.setMessage('username taken', Text('the username requested is not available'));
	this.setMessage('failed register', Text('there was a problem creating your new account.'));
	this.setMessage('register all fields', Text('please fill in username, password and password again...'));
	this.setMessage('reset email sent', Text('check your email.  reset instructions have been sent.'));	
	
}

SnowGreeter.prototype.init = function(options,statics) {
	
	this.options(options,function() {
		if(this.get('defaults')) {
			this.defaults();
		}
	}.bind(this));
	
	if(!statics)this.statics();
	
	return this;
	
}

SnowGreeter.prototype.defaults = function() {
	
	this.setField('login', 'text', 'A-username', {
		label: Text('email'),
		field: 'email',
		regex: ["^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", "gi"],
		model: {
			field: 'email',
			unique: false
		},
		required: true
	});
	this.setField('login', 'password', 'B-password', {
		label: Text('password'),
		field: 'password',
		regex: ["^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,}$", "g"],
		required: true
	});
	
	this.setField('reset', 'text', 'A-email', {
		label: Text('email'),
		field: 'email',
		regex: ["^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", "gi"],
		required: true
	});
	this.setField('resetcode', 'text', 'A-code', {
		label: Text('code from email'),
		field: 'resetcode',
		required: true
	});
	this.setField('register', 'text', 'A-username', {
		label: Text('email'),
		field: 'email',
		regex: ["^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", "gi"],
		required: true,
		model: {
			field: 'email',
			unique: true
		},
	});
	this.setField('register', 'password', 'B-password', {
		label: Text('password'),
		field: 'password',
		required: true,
		regex: ["^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,}$", "g"],
		attach: {
			label: 'confirm',
			field: 'confirm',
			required: true,
			dependsOn: 'B-password'
		} 
	});
	this.setField('register', 'header', 'C-info', {
		'label': Text('Full Name')
	});
	this.setField('register', 'text','D-name', {
		label: Text('name'),
		'field': 'name',
		modify: ['first','last'],
		modifyParameter: ' ',
		placeholder: 'first last'
	});
	
	if(this.get('register security')) {
		this.setField('register', 'header', 'F-header', {
			'label': Text('Answer the following questions for password reset options.')
		});
		this.setField('register', 'select', 'F1-security', {
			field: 'q1',
			label: Text('Question 1'),
			options: [
				'Select a question',
				'Mothers maiden name',
				'Fathers middle name',
				'Hospital you were born in',
				'House number you grew up in'
			],
			required: true,
			attach: {
				type: 'text',
				field: 'q1Answer',
				required: true,
				placeholder: Text('answer'),
				dependsOn: 'F1-security'
			}
		});
		this.setField('register', 'select', 'F2-security', {
			field: 'q2',
			label: Text('Question 2'),
			options: [
				'select a question',
				'Favorite Color',
				'Favorite Dog Breed',
				'Do you cat?',
				'Your first phone number'
			],
			required: true,
			attach: {
				type: 'text',
				field: 'q2Answer',
				placeholder: Text('answer question 2'),
				required: true,
				dependsOn: 'F2-security'
			}
		});
	}
	
	this._emailDefaults();
}

SnowGreeter.prototype.resetField = function(field) {
	if(field === 'all') {
		this.set('form login',{});
		this.set('form register',{});
		this.set('form reset',{});
		this.set('form resetcode',{});
		this.set('form code',{});
		this.set('form buttons',{});
	} else if(field) {
		this.set('form ' + field, {});
	}
}

SnowGreeter.prototype.setField = function(form,type,name,options) {
	if (!_.isString(form) || !_.isString(type) || !_.isString(name)) {
		return false;
	} 
	if (_.isString(options) || !options) {
		if(!options)options = name;
		options = {
			'label': options,
			'field': options,
			'type': type,
		}
	} else {
		if(!options.label) {
			return false;
		}
		if(!options.field) options.field = options.label;
		options.type = type;
		options.form = form;
	}
	options._name = name;
	
	if(_.isObject(this.get('form ' + form))) {
		var current = this.get('form ' + form);
		current[name] = options;
		this.set('form ' + form, current);
	}
	
}
SnowGreeter.prototype.setMessage = function(field,message) {
	if(_.isString(message)) {
		this.set('message ' + field,message);
	}
}
SnowGreeter.prototype.setButton = function(button,text) {
	if(_.isObject(button)) {
		_.each(button,function(v,k) {
			this.setButton(k, v);
		},this);
	} else if(_.isString(button) && _.isString(text)) {
		var current = this.get('form buttons');
		current[button] = Text(text);
		this.set('form buttons', current);
	}
}

SnowGreeter.prototype._emailDefaults = function() {
	
	this.set('emails from name', keystone.get('name'));
	this.set('emails from email', 'info@inquisive.com');
	this.set('emails reset subject', Text('Reset password request from %s', keystone.get('name')));
	this.set('emails template', '<div>A request has been made to reset your password on ' + keystone.get('name') + '.</div> <div> If this is an error ignore this email.</div><div><br /><a href="{link}">Visit this link to reset your password.</a></div>');
}

SnowGreeter.prototype._statics = function() {
	var app = keystone.app;
	app.use( express.static(__dirname + "/public"));
}


SnowGreeter.prototype.statics = function() {
	var static = keystone.get('static');
	if (!_.isArray(static)) {
		static = [static]
	}
	static.push(__dirname + "/public");
	keystone.set('static',static);
	this._public = true;
}

SnowGreeter.prototype.add = function(setview) {
	/* add the greeter page
	 * */
	var app = keystone.app,
		view = setview && setview !== undefined ? setview: this.get('route greeter'),
		snowpi = this,
		userModel = this.get('user model');
	
	this._emailDefaults();
	
	/* add our static files as an additional directory
	 * */
	if(!this._public) snowpi._statics();
	
	/* middleware to add snowpiResponse
	 * */
	var publicAPI = function(req, res, next) {
		res.snowpiResponse = function(status) {
			//add the requesting url back to the response
			status.url=req.protocol + '://' + req.get('host') + req.originalUrl; 
			/* you can customize the response here using the status object.  dont overwrite your existing props. */
			
			/* add in the response with json */
			if (req.query.callback)
				res.jsonp(status);
			else
				res.json(status);
		};
		res.snowpiError = function(key, err, msg, code) {
			msg = msg || 'Error';
			key = key || 'unknown error';
			msg += ' (' + key + ')';
			if (keystone.get('logger')) {
				console.log(msg + (err ? ':' : ''));
				if (err) {
					console.log(err);
				}
			}
			res.status(code || 500);
			res.snowpiResponse({ error: key || 'error', detail: err });
		};
		next();
	};
	
	app.get(view,
		function(req, res) {
			
			if (req.user) {
				return res.redirect(keystone.get('signin redirect'));
			}
			
			//send our own result here
			var templatePath = __dirname + '/templates/views/greeter.jade';
			
			var jadeOptions = {
				filename: templatePath,
				pretty: keystone.get('env') !== 'production'
			};
	
			var compileTemplate = function() {
				return jade.compile(fs.readFileSync(templatePath, 'utf8'), jadeOptions);
			};
			
			var template = keystone.get('viewCache')
				? templateCache[view] || (templateCache[view] = compileTemplate())
				: compileTemplate();
			
			var locals = {
				env: keystone.get('env'),
				brand: keystone.get('name'),
				logoman: snowpi.get('logoman'),
				greeterStyle: snowpi.get('greeter style'),
				keystoneStyle: snowpi.get('keystone style'),
				customStyle: snowpi.get('custom style'),
				user: req.user,
				signout: keystone.get('signout url'),
				section: {},
				title: keystone.get('brand'),
				csrf_token_key: keystone.security.csrf.TOKEN_KEY,
				csrf_token_value: keystone.security.csrf.getToken(req, res),
				//csrf_query: '&' + keystone.security.csrf.TOKEN_KEY + '=' + keystone.security.csrf.getToken(req, res),
				text: JSON.stringify(snowpi._locals(req, res))
			};
	
			// Render the view
			var html = template(locals);
	
			res.send(html);
			
		}
	);
	
	/* add the api controller
	 * */
	app.post(snowpi.get('route reset'),
		publicAPI, //middleware to add api response
		function(req,res) {
			
			/* set up Email */
			var Email = new keystone.Email({ 
				templateMandrillName: 'reset-pass',
				templateMandrillContent: [
					{
						"name": "header",
						"content": "<h2>" + keystone.get('name') + "</h2>"
					}
				],
				templateName: 'reset-pass',
				//customCompileTemplate: function(callback) {
				//	callback(null, snowpi.get('emails template').replace('{link}', req.protocol + '://' + req.get('host') + view + '?courier=4567890'));
				//}
			});
			//Email.templateForceHtml = true;
			Email.send({
				to: req.body.email,
				from: {
					name: snowpi.get('emails from name'),
					email: snowpi.get('emails from email')
				},
				subject: snowpi.get('emails reset subject'),
				templateMandrillContent: [
					{
						"name": "main",
						"content": snowpi.get('emails template').replace('{link}', req.protocol + '://' + req.get('host') + view + '?courier=4567890')
					}
				],
				mandrillOptions: {
					track_opens: false,
					track_clicks: false,
					preserve_recipients: false,
					inline_css: true
				},
			}, 
			function(err, info) {
				if (snowpi.get('debug') && err) console.log(err);
				//console.log(info);
				res.snowpiResponse({action:'greeter',command:'reset',success:'yes',message:snowpi.get('message reset email sent'),code:401,data:{}});
			});
		
		}
	);
	app.post(snowpi.get('route relay'), 
		publicAPI, //middleware to add api response
		function(req, res) {
			if (req.user) {
				return res.snowpiResponse({action:'greeter',command:'login',success:'yes',message:snowpi.get('message current user'),code:200,data:{},redirect:{path:keystone.get('signin redirect'),when:20000}});
			}
			
			if (req.method === 'POST') {
				
				
				if (!keystone.security.csrf.validate(req)) {
					return res.snowpiResponse({action:'greeter',command:'directions',success:'no',message:snowpi.get('message bad token'),code:501,data:{}});
				}
				var locals = res.locals;
				
				var runner=Object.keys(req.body);
				runner.forEach(function(param) {
					req.body[param] = sanitizer.sanitize(req.body[param]);
					//sanitize everything.  I want a better sanitizer for general use
				});
				/* we expect "yes"===true and "no"===false */
				if(req.body.login === yes) { 
					
					if (!req.body.email || !req.body.password) {
						
						return res.snowpiResponse({action:'greeter',command:'login',success:'no',message:snowpi.get('message valid credentials'),code:401,data:{}});
					}
					
					var onSuccess = function(user) {			
						
						return res.snowpiResponse({action:'greeter',command:'login',success:'yes',message:snowpi.get('message welcome').replace('{user}',req.body.email),code:200,data:{person:user},redirect:{path:keystone.get('signin redirect'),when:snowpi.get('redirect timer')}});
					}
					
					var onFail = function() {
						return res.snowpiResponse({action:'greeter',command:'login',success:'no',message:snowpi.get('message valid credentials'),code:401,data:{}});
					}
					
					keystone.session.signin({ email: req.body.email, password: req.body.password }, req, res, onSuccess, onFail);
					
				} else if(req.body.register === yes) { 
					if(snowpi.get('debug'))console.log('allow register',snowpi.get('allow register'))
					if(snowpi.get('allow register'))
					{
						async.series([
							
							function(cb) {
								
								if (!req.body.password || !req.body.confirm || !req.body.email) {
									return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:snowpi.get('message register all fields'),code:401,data:{}});
								}
								
								if (req.body.password != req.body.confirm) {
									return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:snowpi.get('message password match'),code:401,data:{}});
								}
								
								return cb();
								
							},
							
							function(cb) {
								if(snowpi.get('debug'))console.log('check user');
								keystone.list(userModel).model.findOne({ email: req.body.email }, function(err, user) {
									
									if (err || user) {
										return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:snowpi.get('message username taken'),code:401,data:{}});
									}
									
									return cb();
									
								});
								
							},
							function(cb) {
								if(snowpi.get('debug'))console.log('check email');
								keystone.list(userModel).model.findOne({ realEmail: req.body.email }, function(err, user) {
									
									if (err || user) {
										return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:'user exists with that email',code:401,data:{}});
									}
									
									return cb();
									
								});
								
							},
							
							function(cb) {
								if(snowpi.get('debug'))console.log('add user');
								/* build the doc from our set variables
								 * */
								
								var userData = {}
								var name =snowpi.get('field name');
								if(name) {
									if(name instanceof Array && name.length > 2) {
										
										var splitName = req.body.name.split(' ');
										
										userData[name[0]] = {}
										
										userData[name[0]][name[1]] = splitName[0];
										var cname;
										if(splitName.length >2) {
											
											for(var i=1;i<=splitName.length;i++) {
												cname+=' ' + (splitName[i] || '');
											}
											
										} else {
											cname = splitName[1] || '';
										}
										userData[name[0]][name[2]] =cname;
									
									} else if(name instanceof Array && name.length === 2) {
										
										userData[name[0]] = {}
										userData[name[0]][name[1]] = req.body.name;
										
									} else if(name instanceof Array){
										
										userData[name[0]] = req.body.name;
										
									} else {
										
										userData[name] = req.body.name;
										
									}
								}
								if(snowpi.get('field username'))
									userData[snowpi.get('field username').field] = req.body.username
								if(snowpi.get('field password'))
									userData[snowpi.get('field password').field] = req.body.password
								if(snowpi.get('field email'))
									userData[snowpi.get('field email').field] = req.body.email
								userData.isAdmin = snowpi.get('new user can admin')
								
								// security questions
								var sq = snowpi.get('field reset questions');
								if(_.isArray(sq) && sq.length > 0) {
									userData.questions = {};
									sq.forEach(function (val) {
										userData.questions[val.field] = req.body[val.field + '_select']
										userData.questions[val.answer] = req.body[val.field]
									});
								}
								
								var User = keystone.list(userModel).model,
									newUser = new User(userData);
								if(snowpi.get('debug'))console.log('new user set to save',newUser,req.body);
								newUser.save(function(err) {
									return cb(err);
								});
							
							}
							
						], function(err){
							
							if (err) 
							{
								if(snowpi.get('debug'))console.log('user reg failed',err);
								return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:snowpi.get('message failed register'),code:401,data:{}});
							}
							var onSuccess = function(user) {
								return res.snowpiResponse({action:'greeter',command:'register',success:'yes',message:snowpi.get('message welcome').replace('{user}',user.fullname),code:200,data:{person:user},redirect:{path:keystone.get('signin redirect'),when:snowpi.get('redirect timer')}});
							}
							
							var onFail = function(e) {
								return res.snowpiResponse({action:'greeter',command:'register',success:'yes',message:snowpi.get('message welcome login'),code:401,data:{}});
							}
							
							keystone.session.signin({ email: req.body.username, password: req.body.password }, req, res, onSuccess, onFail);
							
						});
					} else {
						return res.snowpiResponse({action:'greeter',command:'register',success:'no',message:snowpi.get('message registration closed'),code:401,data:{}});
					}
					
				} else {
					return res.snowpiResponse({action:'greeter',command:'directions',success:'no',message:'You are lost.  Try and send a command I understand.',code:501,data:{}});
				}
			
			} else {
				//no truth for gets
				return false;
			}
			
		}
	); //end app.post
	
}
SnowGreeter.prototype._locals = function(req, res) {
	var root = {
		name: keystone.get('name'),
		logoman: this.get('logoman'),
		host: req.get('host'),
		relay: this.get('route relay'),
		resetemail: this.get('route reset'),
		signout: keystone.get('signout url'),
		brand: keystone.get('brand'),
		isKey: keystone.security.csrf.TOKEN_KEY,
		isMe: keystone.security.csrf.getToken(req, res),
	};
	root.login = this.get('form login');
	root.reset = this.get('form reset');
	root.register = this.get('form register');
	root.btns = this.get('form buttons');
	debug(config);
	var cfg = _.merge(config, root);
	
	return cfg;
	
}

SnowGreeter.prototype.set = function(key,value) {
	
	if (arguments.length === 1) {
		return this._options[key];
	}
	// old config used text instead of label
	if(key.trim().slice(-4) === 'text') {
		this._options[key] = value;
		var nn = key.trim().split(' ');
		key = nn[0] + ' label';
	}
	this._options[key] = value;
	
	return this._options[key];
	
}

SnowGreeter.prototype.options = function(options,callback) {
	
	if(_.isObject(options)) {
		_.each(options,function(v,k) {
			this.set(k,v);
		},this);
	}
	if(_.isFunction(callback)) {
		return callback();
	}
	return this._options;
}

SnowGreeter.prototype.get = SnowGreeter.prototype.set;

var snowgreeter = module.exports = exports = new SnowGreeter();
/**
 * 2014 snowkeeper
 * github.com/snowkeeper
 * npmjs.org/snowkeeper
 * 
 * Peace :0)
 * 
 * */
