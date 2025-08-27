import React from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import DnsIcon from '@material-ui/icons/Dns';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import AccountCircle from '@material-ui/icons/AccountCircle';
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay';
import FastForwardIcon from '@material-ui/icons/FastForward';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import DomainIcon from '@material-ui/icons/Domain';
import GetAppIcon from '@material-ui/icons/GetApp';

import { NotificationContext } from './common/NotificationProvider';

const useStyles = makeStyles( theme => ({
  drawer: {
    width: 250,
    flexShrink: 0,
  },
  drawerPaper: {
    width: 250,
  },
  toolbar: {
    ...theme.mixins.toolbar,
    padding: "1em",
    fontSize: "0.875em",
  },
}) );

const navGroups = [
  [
    { key: 'servers', label: 'Servers', icon: <DnsIcon />, adminOnly: false },
    { key: 'nsgroups', label: 'Nameserver Groups', icon: <GroupWorkIcon />, adminOnly: false },
  ], [
    { key: 'zones', label: 'DNS Zones', icon: <DomainIcon />, adminOnly: false },
    { key: 'fwdgroups', label: 'Forwarder Groups', icon: <FastForwardIcon />, adminOnly: false },
    { key: 'acls', label: 'Access Lists', icon: <LockOpenIcon />, adminOnly: false },
    { key: 'importer', label: 'Data Import', icon: <GetAppIcon />, adminOnly: false },
  ], [
    { key: 'users', label: 'User Management', icon: <AccountCircle />, adminOnly: true },
    { key: 'audit', label: 'Audit Log', icon: <PlaylistPlayIcon />, adminOnly: true },
  ]
];

export default function AppNavMenu(props) {
  const classes = useStyles();
  const history = useHistory();

  return (
    <Drawer variant="permanent" anchor="left" className={classes.drawer} classes={{paper: classes.drawerPaper}}>
      <div className={classes.toolbar}>
        <NotificationContext.Consumer>
          { ({appInfo}) => (<div>DnsNM {appInfo.appVersion}</div>) }
        </NotificationContext.Consumer>
        <a href="https://dnsnodemanager.com/documentation" target="_blank" rel="noopener noreferrer">Online Documentation</a>
      </div>
      <Divider />
      <List>
        { navGroups.map((navItems, index) => (
          <React.Fragment key={index}>
            { navItems.map((item, index) => (
              <ListItem button key={index} disabled={! props.admin && item.adminOnly} onClick={() => { history.push("/" + item.key); }}>
                { Boolean(item.icon) && <ListItemIcon>{item.icon}</ListItemIcon> }
                <ListItemText primary={item.label} />
              </ListItem>
            )) }
            <Divider />
          </React.Fragment>
        )) }
      </List>
    </Drawer>
  );
}
