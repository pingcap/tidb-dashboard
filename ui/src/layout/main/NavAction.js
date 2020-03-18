import React from 'react';
import classNames from 'classnames';
import styles from './NavAction.module.less';

class NavAction extends React.PureComponent {
  render() {
    const { children, className, ...rest } = this.props;
    return (
      <div className={classNames(styles.navAction, className)} {...rest}>
        {children}
      </div>
    );
  }
}

export default NavAction;
