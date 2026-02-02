import React from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Typography from '@material-ui/core/Typography';
import DnsIcon from '@material-ui/icons/Dns';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import AccountCircle from '@material-ui/icons/AccountCircle';
import FastForwardIcon from '@material-ui/icons/FastForward';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import DomainIcon from '@material-ui/icons/Domain';
import GetAppIcon from '@material-ui/icons/GetApp';

import { useTranslation } from './common/LanguageContext';

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

function getNavGroups(t) {
  return [
    [
      { key: 'servers', label: t('nav.servers'), icon: <DnsIcon />, adminOnly: false },
      { key: 'nsgroups', label: t('nav.nsgroups'), icon: <GroupWorkIcon />, adminOnly: false },
    ], [
      { key: 'zones', label: t('nav.zones'), icon: <DomainIcon />, adminOnly: false },
      { key: 'fwdgroups', label: t('nav.fwdgroups'), icon: <FastForwardIcon />, adminOnly: false },
      { key: 'acls', label: t('nav.acls'), icon: <LockOpenIcon />, adminOnly: false },
      { key: 'importer', label: t('nav.importer'), icon: <GetAppIcon />, adminOnly: false },
    ], [
      { key: 'users', label: t('nav.users'), icon: <AccountCircle />, adminOnly: true },
    ]
  ];
}

export default function AppNavMenu(props) {
  const classes = useStyles();
  const history = useHistory();
  const { t } = useTranslation();
  const navGroups = getNavGroups(t);

  return (
    <Drawer variant="permanent" anchor="left" className={classes.drawer} classes={{paper: classes.drawerPaper}}>
      <div className={classes.toolbar}>
        <Typography variant="h6" noWrap className={classes.appTitle}>{t('app.title')}</Typography>
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
