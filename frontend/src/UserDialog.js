import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';

export default function UserDialog(props) {
  const [data, setData] = React.useState({...props.data, password: ''});
  const [busy, setBusy] = React.useState(false);

  function handleInputChange(event) {
    const key = event.target.name;
    const value = event.target.value;
    setData( prevData => ({...prevData, [key]: value}) );
  }

  function submit() {
    setBusy(true);
    props.onSubmit(data).then( result => {
      if( ! result ) setBusy(false);
    } );
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs">
      <DialogTitle>{props.new ? 'Create Local User' : 'Update User'}</DialogTitle>
      <DialogContent>
        <form>
          <TextField autoFocus fullWidth variant="outlined" margin="dense" name="name" label="Username" value={data.name} onChange={handleInputChange} />
          <TextField fullWidth variant="outlined" margin="dense" name="password" type="password" label={props.new ? "Password" : "New Password"} helperText={props.new ? null : "Leave blank to retain current password"} value={data.password} onChange={handleInputChange} />
          <FormControl fullWidth variant="outlined" margin="dense">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={data.role} onChange={handleInputChange} label="Role">
              { Object.entries(props.roles).map( role => <MenuItem key={role[0]} value={role[0]}>{role[1]}</MenuItem> ) }
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submit}>{props.new ? 'Add User' : 'Save Changes'}</Button>
      </DialogActions>
    </Dialog>
  );
}

UserDialog.defaultProps = {
  data: { name: '', role: '' }
}
