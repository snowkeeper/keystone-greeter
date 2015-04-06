var React = require('react');
var Text = JSON.parse(require('text'));
var Common = require('../common.js');
var GInterval = Common.GInterval;
var _ = require('lodash');
var ReactBootstrap = require('react-bootstrap');
var BootstrapButton = ReactBootstrap.Button;
var yes = 'yes', no = 'no';
//var yes = true, no = false;

var Login = React.createClass({
	mixins: [React.addons.LinkedStateMixin],
	getInitialState: function() {
		return this.setFormState();
	},
	componentWillReceiveProps: function() {
		this.setState(this.setFormState(this.state.valid));
	},
	setFormState: function(valid) {
		var ret = Common.setFormState(Text.login, valid);
		ret.name = 'login';
		return ret; 
	},
	handleSubmit: function(e) {
		return e.preventDefault();
	},
	onChange: function(e) {
		Common.FormInputOnChange.call(this, e, Text.login);
	},
	render: function() {
						
			return (<form  ref='signin'  className="signin-form"  onSubmit={this.handleSubmit} >
				<h2>{Text.home.login} <Common.GMan /></h2>
				{this.props.flash}
					
					<Common.Form inputs={Text.login} context={this} />
					
					<div className="clearfix" ><br /></div>
					
					<div className="col-xs-6 "  ><BootstrapButton role="button" onClick={this.login}  bsStyle='info' disabled={Common.showButton(this.state.valid)}>  {Text.btns.login} </BootstrapButton></div> 
					
					<div className="col-xs-6 " style={{textAlign:'right'}} ><BootstrapButton onClick={this.props.showregister}  bsStyle='warning'>  {Text.btns.register} </BootstrapButton></div> 
					
					<div className="clearfix" ><br /></div>
					
					<div className="col-xs-offset-6 col-xs-6 " style={{textAlign:'right'}} ><BootstrapButton role="button" onClick={this.props.changeReset}  bsStyle='default' >  {Text.btns.reset} </BootstrapButton></div> 
					
					<div className="clearfix" ></div>
			</form>);
			
	},
	login: function() {
		/* same as register but less info sent
		 * you could combine them both if you like less code
		 * */
		var mydata = {login:'yes'};
		//console.log('form', this.state.form, Text.login );
		_.each(this.state.form, function(v,k) {
			if(v.type !== 'header') {
				var el = document.getElementById(v);
				mydata[k] = el.value;
			}
		},this); 
		mydata[isKey] = isMe;
		//console.log('mydata', mydata, 'Text', Text.login );
		$.ajax({
			url: Text.relay,
			dataType: 'json',
			method: 'post',
			data: mydata,
			success: function(data) {
				function message() {
					var secs = (data.redirect.when - rrr) / 1000;
					rrr+=1000;
					data.message = data.repeater + '<br />You will be redirected to <a href="' + data.redirect.path + '">' + data.redirect.path.substr(1) + '</a>  ';
					data.message+= secs === 0 ? ' now':' in ' + secs + ' seconds.';
				}
				if(typeof data.redirect === 'object' && data.redirect.when>1000) {
					data.repeater = data.message;
					var rrr = 1000
						_self = this.props.context;
					GInterval.redirect = GInterval.setInterval(function() {
						message();
						_self.setState({response:yes,data:data});
					},1000);
					console.log(GInterval.intervals)
					GInterval.timeout = setTimeout(function(){
						GInterval.clearIntervals(GInterval.redirect);
						window.location.href = data.redirect.path;
					},data.redirect.when);
					message()
				}
				else if(typeof data.redirect === 'object' && data.redirect.path){
					window.location.href = data.redirect.path;
				}
				
				this.props.context.setState({response:yes,data:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.log(err, status, err.toString());
				this.props.context.setState({response:yes,data: {status:status,err:err.toString()} });
			}.bind(this)
		});		
	}
}); 

module.exports = Login;