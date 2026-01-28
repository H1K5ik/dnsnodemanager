import React from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";

import CssBaseline from '@material-ui/core/CssBaseline';
import Box from '@material-ui/core/Box';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import CircularProgress from '@material-ui/core/CircularProgress';
import Backdrop from '@material-ui/core/Backdrop';
import { makeStyles } from '@material-ui/core/styles';

import AuthenticationProvider, { AuthenticationContext } from "./common/AuthenticationProvider";
import NotificationProvider, { NotificationContext } from "./common/NotificationProvider";
import LoginScreen from "./LoginScreen";
import AppNavMenu from "./AppNavMenu";
import AppHeaderBar from "./AppHeaderBar";
import Dashboard from "./Dashboard";
import ServerManager from "./ServerManager";
import AccessListManager from "./AccessListManager";
import FwdGroupManager from "./FwdGroupManager";
import NsGroupManager from "./NsGroupManager";
import DnsManager from "./DnsManager";
import DnsRecordManager from "./DnsRecordManager";
import DataImporter from "./DataImporter";
import UserManager from "./UserManager";

const useStyles = makeStyles( theme => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff'
  },
  root: {
    display: 'flex',
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
  },
  toolbarDummy: theme.mixins.toolbar,
}) );

export default function App(props) {
  const classes = useStyles();

  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthenticationProvider>
          <AuthenticationContext.Consumer>
            { ({user}) => user.role === null ? <LoginScreen /> : (
              <div className={classes.root}>
                <CssBaseline />
                <AppHeaderBar />
                <AppNavMenu admin={user.role === 'sysadmin'} />
                <div className={classes.content}>
                  <div className={classes.toolbarDummy} />
                  <Box>
                    <Switch>
                      { user.role === 'sysadmin' && <Route path="/users" component={UserManager} /> }
                      <Route path="/servers" component={ServerManager} />
                      <Route path="/fwdgroups" component={FwdGroupManager} />
                      <Route path="/acls" component={AccessListManager} />
                      <Route path="/nsgroups" component={NsGroupManager} />
                      <Route path="/zones" component={DnsManager} />
                      <Route path="/zone/:id" component={DnsRecordManager} />
                      <Route path="/importer" component={DataImporter} />
                      <Route path="/" component={Dashboard} />
                    </Switch>
                  </Box>
                </div>
              </div>
            ) }
          </AuthenticationContext.Consumer>
          <NotificationContext.Consumer>
            { ({notification, clearNotification, busy}) => (
              <>
                <Snackbar open={notification.show} autoHideDuration={6000} onClose={clearNotification}>
                  <Alert elevation={6} variant="filled" severity={notification.type}>{String(notification.message)}</Alert>
                </Snackbar>
                <Backdrop className={classes.backdrop} open={busy}>
                  <CircularProgress color="inherit" />
                </Backdrop>
              </>
            ) }
          </NotificationContext.Consumer>
        </AuthenticationProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
