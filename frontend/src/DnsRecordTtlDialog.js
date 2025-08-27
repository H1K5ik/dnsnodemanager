import React from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import useAPI from './common/api';

export default function DnsRecordTtlDialog(props) {
  const [busy, setBusy] = React.useState(false);
  const [ttl, setTtl] = React.useState(null);
  const api = useAPI();

  function handleInputChange(event) {
    let key   = event.target.name;
    let value = event.target.value;
    if( key === "inheritTTL" ) {
      let isChecked = event.target.checked;
      setTtl(isChecked ? null : 3600);
    } else {
      setTtl(value);
    }
  }

  function submitForm() {
    const data = { records: props.records.map(rec => rec.ID), ttl: ttl };
    setBusy(true);
    api.updateRecordsTTL(data).then( result => {
      setBusy(false);
      if( result ) {
        props.onClose();
        props.onRefresh();
      }
    } );
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey}>
      <DialogTitle>Update Records TTL</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={<Switch checked={ttl === null} onChange={handleInputChange} name="inheritTTL" color="primary" />}
          label="Inherit TTL from zone defaults"
        />
        { ttl !== null && <div><TextField variant="outlined" defaultValue={ttl} name="ttl" label="New TTL" onChange={handleInputChange} /></div> }
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submitForm}>Update Records</Button>
      </DialogActions>
    </Dialog>
  );
}
