import React from "react";

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';
import SettingsIcon from '@material-ui/icons/Settings';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import { makeStyles } from '@material-ui/core/styles';
import { green } from '@material-ui/core/colors';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import { NotificationContext } from "./common/NotificationProvider";
import useAPI from './common/api';

const useStyles = makeStyles( theme => ({
  appBar: {
    width: "calc(100% - 250px)",
    marginLeft: 250,
  },
  appTitle: {
    flexGrow: 1
  },
  configIcon: {
    marginRight: theme.spacing(3)
  }
}) );

function SyncDialog(props) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Sync Status</DialogTitle>
      <DialogContent>
        DNS Configuration isn't synchronized on all servers.<br />
        Make sure to sync when you're done making changes.<br />
        <br />
        Synchronize now?
      </DialogContent>
      <DialogActions>
        <Button disabled={props.busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={props.busy || props.readOnly} onClick={props.onSubmit}>Sync Now</Button>
      </DialogActions>
    </Dialog>
  );
}

function StatusIcon(props) {
  const classes = useStyles();
  return props.sync ? (
    <Tooltip title="Config up-to-date on all servers">
      <SettingsIcon className={classes.configIcon} style={{ color: green[500] }} />
    </Tooltip>
  ) : (
    <Tooltip title="Config isn't sync on all servers">
      <IconButton aria-haspopup="true" color="inherit" onClick={props.onClick}>
        <Badge className={classes.configIcon} badgeContent="!" color="secondary">
          <SettingsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

export default function AppHeaderBar(props) {
  const [working, setWorking] = React.useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const notifier = React.useContext(NotificationContext);
  const session = React.useContext(AuthenticationContext);
  const readOnly = !['dnsop','dnsadmin','sysadmin'].includes(session.user.role);
  const classes = useStyles();
  const api = useAPI();

  React.useEffect(getSyncStatus, []); // eslint-disable-line

  function getSyncStatus() {
    setWorking(true);
    notifier.getConfigSync().then( () => {
      setWorking(false);
    } );
  }

  function syncNow() {
    setWorking(true);
    setSyncDialogOpen(false);
    api.syncAllServers().then( result => {
      getSyncStatus();
    } );
  }

  function logout() {
    api.logoutUser().then( () => {
      session.clearUser();
      //window.location.href = "/";
    } );
  }

  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar>
        <StatusIcon sync={notifier.configSync} onClick={() => { setSyncDialogOpen(true); }} />
        <SyncDialog open={syncDialogOpen} busy={working} readOnly={readOnly} onClose={() => { setSyncDialogOpen(false); }} onSubmit={syncNow} />
        <Typography variant="h6" noWrap className={classes.appTitle}>DnsNodeManager</Typography>
        <Button color="inherit" onClick={logout}>Logout</Button>
      </Toolbar>
    </AppBar>
  );
}
