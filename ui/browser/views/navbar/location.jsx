
import React, { PropTypes, Component } from 'react';
import { connect } from 'react-redux';
import { ipcRenderer } from 'electron';
import { menuLocationContext } from '../../actions/external';
import { setLocation } from '../../actions/main-actions';
import { fixURL, getCurrentWebView } from '../../browser-util';

/**
 * The URL / location bar.
 * This needs to be a heavyweight component because we need to add listeners
 * to ipcRenderer on mount, and because the key-down event handler is non
 * trivial.
 */
class Location extends Component {
  constructor() {
    super();
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on('focus-urlbar', () => this.refs.input.select());
  }

  handleKeyDown(ev) {
    if (ev.keyCode === 13) { // enter
      const location = fixURL(ev.target.value);
      const webview = getCurrentWebView(ev.target.ownerDocument);
      webview.setAttribute('src', location);
    } else if (ev.keyCode === 27) { // esc
      // Restore back to page location and reset userTyped
      this.props.dispatch(setLocation());
      ev.target.select();
    }
  }

  render() {
    const { page, dispatch } = this.props;
    const value = page.userTyped !== null ? page.userTyped : page.location;

    return (
      <input id="urlbar-input" type="text" ref="input"
        value={value}
        onChange={ev => dispatch(setLocation(ev.target.value))}
        onClick={ev => ev.target.select()}
        onContextMenu={ev => menuLocationContext(ev.target, dispatch)}
        onKeyDown={this.handleKeyDown} />
    );
  }
}

Location.propTypes = {
  page: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
};

export default connect()(Location);
