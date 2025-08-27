import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

export default function NsGroupDialog(props) {

  function pressKey(event) {
    if(event.key === 'Enter') props.onSubmit();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey}>
      <DialogTitle>{props.new ? 'Create Nameserver Group' : 'Update Group Name'}</DialogTitle>
      <DialogContent>
        <TextField autoFocus required fullWidth variant="outlined" name="name" label="NS Group Name" defaultValue={props.defaultName} onChange={props.onInput} />
      </DialogContent>
      <DialogActions>
        <Button disabled={props.blocked} onClick={props.onClose}>Cancel</Button>
        <Button disabled={props.blocked} onClick={props.onSubmit}>{props.new ? 'Add Group' : 'Save Changes'}</Button>
      </DialogActions>
    </Dialog>
  );

}
