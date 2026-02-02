import React from "react";

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';
import IconButton from '@material-ui/core/IconButton';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import SettingsIcon from '@material-ui/icons/Settings';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { makeStyles } from '@material-ui/core/styles';
import { green } from '@material-ui/core/colors';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import { NotificationContext } from "./common/NotificationProvider";
import { useTranslation } from "./common/LanguageContext";
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
  const { t } = useTranslation();
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>{t("app.syncStatus")}</DialogTitle>
      <DialogContent>
        {t("app.syncNotOnAll")}<br />
        {t("app.syncWhenDone")}<br />
        <br />
        {t("app.syncNow")}
      </DialogContent>
      <DialogActions>
        <Button disabled={props.busy} onClick={props.onClose}>{t("app.cancel")}</Button>
        <Button disabled={props.busy || props.readOnly} onClick={props.onSubmit}>{t("app.syncNowBtn")}</Button>
      </DialogActions>
    </Dialog>
  );
}

function StatusIcon(props) {
  const classes = useStyles();
  const { t } = useTranslation();
  return props.sync ? (
    <Tooltip title={t("app.configUpToDate")}>
      <SettingsIcon className={classes.configIcon} style={{ color: green[500] }} />
    </Tooltip>
  ) : (
    <Tooltip title={t("app.configNotSync")}>
      <IconButton aria-haspopup="true" color="inherit" onClick={props.onClick}>
        <Badge className={classes.configIcon} badgeContent="!" color="secondary" overlap="rectangular">
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
  const { t, language, setLanguage } = useTranslation();
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
        <Typography variant="h6" noWrap className={classes.appTitle}>{t("app.title")}</Typography>
        <ToggleButtonGroup value={language} exclusive onChange={(e, v) => v && setLanguage(v)} size="small" style={{ marginRight: 16, color: 'inherit' }}>
          <Typography variant="h6" noWrap className={classes.appTitle} style={{ paddingRight: 10, marginTop: 5 }}>{t("app.special")}</Typography>
          <ToggleButton value="en" style={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.3)' }}>EN</ToggleButton>
          <ToggleButton value="ru" style={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.3)' }}>RU</ToggleButton>
        </ToggleButtonGroup>
        <Button color="inherit" onClick={logout}>{t("app.logout")}</Button>
      </Toolbar>
    </AppBar>
  );
}
