define(["exports", "module", "react", "classnames"], function (exports, module, _react, _classnames) {
  "use strict";

  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  var React = _interopRequire(_react);

  var classSet = _interopRequire(_classnames);

  var Grid = React.createClass({
    displayName: "Grid",

    propTypes: {
      fluid: React.PropTypes.bool,
      componentClass: React.PropTypes.node.isRequired
    },

    getDefaultProps: function getDefaultProps() {
      return {
        componentClass: "div"
      };
    },

    render: function render() {
      var ComponentClass = this.props.componentClass;
      var className = this.props.fluid ? "container-fluid" : "container";

      return React.createElement(
        ComponentClass,
        _extends({}, this.props, {
          className: classSet(this.props.className, className) }),
        this.props.children
      );
    }
  });

  module.exports = Grid;
});