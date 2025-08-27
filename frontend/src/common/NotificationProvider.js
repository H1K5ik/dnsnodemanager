import React from "react";
import useAPI from "./api";

export const NotificationContext = React.createContext( {
  // Notifications, Alerts
  appInfo: {},
  notification: {
    show: false,
    type: "info",
    message: ""
  },
  setNotification: () => {},
  clearNotification: () => {},
  // Backdrop
  isBusy: false,
  showBackdrop: () => {},
  hideBackdrop: () => {},
  // App bar Notifications
  configSync: true,
  setConfigSync: () => {},
  getConfigSync: () => {},
} );

export default function NotificationProvider(props) {
  const [appInfo, setAppInfo] = React.useState({appVersion:'', rrTypes:[]});
  const [alert, setAlert] = React.useState({show: false, type: "info", message: ""});
  const [busy, setBusy] = React.useState(false);
  const [sync, setSync] = React.useState(true);
  const api = useAPI();

  function getAppInfo() {
    api.getAppInfo().then(setAppInfo);
  }

  React.useEffect(getAppInfo, []); // eslint-disable-line

  const contextValue = {
    busy: busy,
    appInfo: appInfo,
    notification: alert,
    showBackdrop: () => {
      setBusy(true);
    },
    hideBackdrop: () => {
      setBusy(false);
    },
    setNotification: (type, message) => {
      setAlert({show: true, type: type, message: message});
    },
    clearNotification: () => {
      setAlert({show: false, type: "info", message: ""});
    },
    configSync: sync,
    setConfigSync: (bool) => {
      setSync(bool);
    },
    getConfigSync: () => {
      return api.getServers().then( servers => {
        const sum = servers.map(server => (server.update_required)).reduce((a, b) => a + b, 0);
        setSync(!Boolean(sum));
        return sync;
      } );
    }
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {props.children}
    </NotificationContext.Provider>
  );
}
