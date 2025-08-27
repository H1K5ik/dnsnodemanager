import React from "react";
import useAPI from './api';
import CircularProgress from '@material-ui/core/CircularProgress';
import Backdrop from '@material-ui/core/Backdrop';

export const AuthenticationContext = React.createContext( {
  user: { name: 'anonymous', role: null },
  getUser: () => {},
  setUser: () => {},
  clearUser: () => {},
} );

export default function AuthenticationProvider(props) {
  const [user, setUser] = React.useState(null);
  const api = useAPI();

  const contextValue = {
    user: user,
    getUser: () => {
      api.getSessionUser().then(setUser);
    },
    clearUser: () => {
      setUser({ name: 'anonymous', role: null });
    },
  };

  React.useEffect(contextValue.getUser, []); // eslint-disable-line

  return Boolean(user) ? (
    <AuthenticationContext.Provider value={contextValue}>
      {props.children}
    </AuthenticationContext.Provider>
  ) : (
    <Backdrop open={true}>
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
