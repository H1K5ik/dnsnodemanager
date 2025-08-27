import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

export default function FwdGroupDialog(props) {
  const [data, setData] = React.useState({...props.data});
  const [busy, setBusy] = React.useState(false);

  function handleInput(event) {
    const name = event.currentTarget.name;
    const value = event.currentTarget.value;
    setData( prevData => ({...prevData, [name]: value}) );
    console.log(data);
  }

  function submit() {
    setBusy(true);
    props.onSubmit(data).finally( () => {
      setBusy(false);
    } );
  }

  function pressKey(event) {
    if(event.key === 'Enter') submit();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey}>
      <DialogTitle>{props.new ? 'Create Forwarder Group' : 'Update Forwarder Group'}</DialogTitle>
      <DialogContent>
        <TextField autoFocus required fullWidth variant="outlined" margin="dense" name="name" label="Group Name" defaultValue={props.data.name} onChange={handleInput} />
        <TextField required fullWidth variant="outlined" margin="dense" name="members" label="IP Addresses" helperText="Comma seperated list of IP Addresses" defaultValue={props.data.members} onChange={handleInput} />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submit}>{props.new ? 'Add Group' : 'Save Changes'}</Button>
      </DialogActions>
    </Dialog>
  );
}

FwdGroupDialog.defaultProps = {
  data: { ID: 0, name: "", members: "" }
}
