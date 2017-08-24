import PropTypes from 'prop-types';
import React from 'react';
import withStyles from 'universal/styles/withStyles';
import {css} from 'aphrodite-local-styles/no-important';
import {textOverflow} from 'universal/styles/helpers';
import ui from 'universal/styles/ui';
import appTheme from 'universal/styles/theme/appTheme';
import makeHoverFocus from 'universal/styles/helpers/makeHoverFocus';
import FontAwesome from 'react-fontawesome';
import {NavLink} from 'react-router-dom';
import Avatar from 'universal/components/Avatar/Avatar';
import defaultUserAvatar from 'universal/styles/theme/images/avatar-user.svg';
import Badge from 'universal/components/Badge/Badge';
import {Menu, MenuItem} from 'universal/modules/menu';

const StandardHub = (props) => {
  const {
    email,
    notificationCount,
    picture,
    preferredName,
    history,
    styles
  } = props;

  const originAnchor = {
    vertical: 'bottom',
    horizontal: 'left'
  };

  const targetAnchor = {
    vertical: 'top',
    horizontal: 'left'
  };

  const goToSettings = () =>
    history.push('/me/settings');

  const goToOrganizations = () =>
    history.push('/me/organizations');

  const goToNotifications = () =>
    history.push('/me/notifications');

  const signOut = () =>
    history.push('/signout');

  const makeUserMenu = () => {
    const itemFactory = () => {
      const listItems = [];
      listItems.push(
        <MenuItem icon="address-card" label="Settings" onClick={goToSettings} />,
        <MenuItem icon="building" label="Organizations" onClick={goToOrganizations} />,
        <MenuItem icon="bell" label="Notifications" onClick={goToNotifications} />,
        <MenuItem icon="sign-out" label="Sign Out" onClick={signOut} hr="before" />
      );
      return listItems;
    };
    return (
      <Menu
        itemFactory={itemFactory}
        label={email}
        originAnchor={originAnchor}
        maxHeight="none"
        menuWidth="13rem"
        targetAnchor={targetAnchor}
        toggle={<div className={css(styles.menuToggle)} />}
      />
    );
  };

  const notificationsStyles = css(
    styles.notifications,
    notificationCount > 0 && styles.notificationsWithBadge,
    // location === '/me/notifications' && styles.notificationsActive
  );

  const iconStyle = {
    lineHeight: 'inherit',
    color: 'white'
  };

  const userAvatar = picture || defaultUserAvatar;

  return (
    <div className={css(styles.root)}>
      <div className={css(styles.user)}>
        <Avatar hasBadge={false} picture={userAvatar} size="small" />
        <div className={css(styles.info)}>
          <div className={css(styles.name)}>{preferredName}</div>
          <div className={css(styles.email)}>{email}</div>
        </div>
        {makeUserMenu()}
      </div>
      <NavLink
        activeClassName={css(styles.notificationsActive)}
        className={notificationsStyles}
        to="/me/notifications"
      >
        <FontAwesome name="bell" style={iconStyle} />
        {notificationCount > 0 &&
          <div className={css(styles.badgeBlock)}>
            <Badge value={notificationCount} />
          </div>
        }
      </NavLink>
    </div>
  );
};

StandardHub.propTypes = {
  email: PropTypes.string,
  notificationCount: PropTypes.number,
  picture: PropTypes.string,
  preferredName: PropTypes.string,
  history: PropTypes.object,
  styles: PropTypes.object
};

const maxWidth = '6.5rem';
const styleThunk = () => ({
  root: {
    alignItems: 'center',
    borderBottom: '2px solid rgba(0, 0, 0, .10)',
    display: 'flex',
    minHeight: '4.875rem',
    padding: '1rem',
    width: '100%'
  },

  user: {
    display: 'flex',
    cursor: 'pointer',
    flex: 1,
    position: 'relative',
    transition: `opacity ${ui.transition[0]}`,

    ':hover': {
      opacity: '.5'
    }
  },

  // Make a single clickable area, over user details, to trigger the menu
  menuToggle: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },

  info: {
    alignItems: 'flex-start',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingLeft: '1rem'
  },

  name: {
    ...textOverflow,
    fontSize: appTheme.typography.sBase,
    fontWeight: 700,
    lineHeight: '1.375rem',
    maxWidth,
    paddingTop: '.125rem'
  },

  email: {
    ...textOverflow,
    fontSize: appTheme.typography.s2,
    lineHeight: appTheme.typography.sBase,
    marginTop: '.125rem',
    maxWidth
  },

  notifications: {
    alignItems: 'center',
    backgroundColor: ui.dashSidebarBackgroundColor,
    borderRadius: ui.buttonBorderRadius,
    display: 'flex',
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    textDecoration: 'none !important',
    transition: `background-color ${ui.transition[0]}`,
    width: 32,

    ...makeHoverFocus({
      backgroundColor: appTheme.palette.dark,
      textDecoration: 'none !important'
    })
  },

  notificationsWithBadge: {
    backgroundColor: appTheme.palette.dark50a
  },

  notificationsActive: {
    backgroundColor: `${appTheme.palette.dark} !important`,
    textDecoration: 'none !important'
  },

  badgeBlock: {
    bottom: '-.375rem',
    position: 'absolute',
    right: '-.375rem'
  }
});

export default withStyles(styleThunk)(StandardHub);
