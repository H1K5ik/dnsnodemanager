import React from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import { NotificationContext } from "./common/NotificationProvider";
import useAPI from './common/api';

function FullTextField(props) {
  return <TextField fullWidth variant="outlined" margin="dense" {...props} />;
}

export default function DnsRecordDialog(props) {
  const [data, setData] = React.useState({...props.data, zone_id: props.zoneId, type: props.recordType});
  const [busy, setBusy] = React.useState(false);
  const [inheritTTL, setInheritTTL] = React.useState(props.data.ttl === null);
  const notifier = React.useContext(NotificationContext);
  const api = useAPI();

  function handleInputChange(event) {
    let key   = event.target.name;
    let value = event.target.value;
    if( key === "inheritTTL" ) {
      let isChecked = event.target.checked;
      setInheritTTL(isChecked);
      setData( prevData => { return { ...prevData, ttl: isChecked ? null : 3600 }; } );
    } else if( key === "addPTR") {
      setData( prevData => { return { ...prevData, [key]: event.target.checked }; } );
    } else {
      setData( prevData => { return { ...prevData, [key]: value }; } );
    }
  }

  function submitForm() {
    setBusy(true);
    const payload = { name: data.name, zone_id: data.zone_id, type: data.type, data: data.data, ttl: data.ttl };
    if( data.type === 'a' ) payload.addPTR = Boolean(data.addPTR);
    if( props.new ) {
      api.addDnsRecord(payload).then( result => {
        setBusy(false);
        if( result ) {
          props.onClose();
          props.onRefresh();
          // reset dialog data
          setData(prevData => ({ ...props.data, zone_id: props.zoneId, type: props.recordType }));
          setInheritTTL(true);
        }
      } );
    } else {
      api.updateDnsRecord({ ...data, addPTR: data.type === 'a' ? Boolean(data.addPTR) : undefined }).then( result => {
        setBusy(false);
        if( result ) {
          props.onClose();
          props.onRefresh();
        }
      } );
    }
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} TransitionProps={{ onEntering: () => { setData(prevData => ({...prevData, type: props.recordType})); } }} onKeyPress={pressKey}>
      <DialogTitle>{ props.new ? 'New ' + notifier.appInfo.rrTypes[props.recordType] : 'Edit ' + notifier.appInfo.rrTypes[props.recordType]  }</DialogTitle>
      <DialogContent>
        { data.type !== 'custom' && <FullTextField autoFocus required name="name" label="Name" defaultValue={data.name} onChange={handleInputChange} /> }
        <FullTextField required name="data" label="Data" defaultValue={data.data} onChange={handleInputChange} helperText={data.type === 'custom' && 'Full text line to be added in the zonefile' } />
        { data.type === 'a' && ( <FormControlLabel control={<Switch checked={data.addPTR} onChange={handleInputChange} name="addPTR" color="primary" />} label={props.new ? "Add corresponding PTR record" : "Rewrite PTR record"} />
        ) }
        <FormControlLabel
          control={<Switch checked={inheritTTL} onChange={handleInputChange} name="inheritTTL" color="primary" />}
          label="Inherit TTL from zone defaults"
        />
        { ! inheritTTL && <FullTextField required={!inheritTTL} disabled={inheritTTL} defaultValue={data.ttl} name="ttl" label="TTL" onChange={handleInputChange} /> }
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submitForm}>{ props.new ? 'Add Record' : 'Save Changes' }</Button>
      </DialogActions>
    </Dialog>
  );
}

DnsRecordDialog.defaultProps = {
  open: false,
  new: false,
  data: {
    ID: 0,
    name: '',
    type: 'a',
    zone_id: 0,
    data: '',
    ttl: null,
    addPTR: false
  }
}
