import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import useAPI from './common/api';

export default function LoginScreen(props) {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  const [cred, setCred] = React.useState({username: '', password: ''});
  const session = React.useContext(AuthenticationContext);
  const api = useAPI();

  function handleInputChange(event) {
    let key   = event.target.name;
    let value = event.target.value;
    setCred( prevData => ({ ...prevData, [key]: value }) );
  }

  function doLogin() {
    setBusy(true);
    setOpen(false);
    api.authenticateUser(cred).then( result => {
      setBusy(false);
      if( result ) {
        session.getUser();
      } else {
        setOpen(true);
      }
    } );
  }

  function pressKey(event) {
    if(event.key === 'Enter') doLogin();
  }

  return (
    <Dialog open={open} onKeyPress={pressKey}>
      <DialogTitle>Authentication</DialogTitle>
      <DialogContent>
        <TextField fullWidth variant="outlined" name="username" label="Username" value={cred.username} onChange={handleInputChange} style={{marginBottom:"0.5em"}} />
        <TextField fullWidth variant="outlined" type="password" name="password" label="Password" value={cred.password} onChange={handleInputChange} />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="primary" disabled={busy} onClick={doLogin}>Login</Button>
      </DialogActions>
    </Dialog>
  );
}
