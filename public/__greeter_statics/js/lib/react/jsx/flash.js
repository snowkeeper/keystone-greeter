var React = require('react');
var ReactBootstrap = require('react-bootstrap');
var GInterval = require('./common.js').GInterval;
/* create flash message 
 * */
var Flash = ReactBootstrap.Alert;

var GFlash = React.createClass({
	getInitialState: function() {
		return {
			isVisible: true
		};
	},
	getDefaultProps: function() {
		return ({showclass:'info'});
	},
	render: function() {
		if(!this.state.isVisible)
		    return null;

		var message = this.props.children;
		return (
		    <Flash bsStyle={this.props.showclass} onDismiss={this.dismissFlash}>
			<p>{message}</p>
		    </Flash>
		);
	},
	/* make sure the user can cancel any redirects by clearing the flash message
	 * */
	dismissFlash: function() {
		this.setState({isVisible: false});
		if(this.props.clearintervals instanceof Array)this.props.clearintervals.map(GInterval.clearIntervals);
		if(this.props.cleartimeouts instanceof Array)this.props.cleartimeouts.map(clearTimeout);
	}
});

module.exports = GFlash;
