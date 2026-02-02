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
import { useTranslation } from "./common/LanguageContext";
import useAPI from './common/api';

function FullTextField(props) {
  return <TextField fullWidth variant="outlined" margin="dense" {...props} />;
}

export default function DnsRecordDialog(props) {
  const [data, setData] = React.useState({...props.data, zone_id: props.zoneId, type: props.recordType});
  const [busy, setBusy] = React.useState(false);
  const [inheritTTL, setInheritTTL] = React.useState(props.data.ttl === null);
  const [ptrReplaceDialogOpen, setPtrReplaceDialogOpen] = React.useState(false);
  const notifier = React.useContext(NotificationContext);
  const api = useAPI();
  const { t } = useTranslation();

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

  function doAddRecord(replacePTR = false) {
    const payload = { name: data.name, zone_id: data.zone_id, type: data.type, data: data.data, ttl: data.ttl };
    if( data.type === 'a' ) {
      payload.addPTR = Boolean(data.addPTR);
      if (replacePTR) payload.replacePTR = true;
    }
    return api.addDnsRecord(payload);
  }

  function submitForm() {
    setBusy(true);
    if( props.new ) {
      doAddRecord().then( result => {
        setBusy(false);
        if (result && result.code === 'PTR_EXISTS') {
          setPtrReplaceDialogOpen(true);
          return;
        }
        if( result && result.success !== false ) {
          props.onClose();
          props.onRefresh();
          setData(prevData => ({ ...props.data, zone_id: props.zoneId, type: props.recordType }));
          setInheritTTL(true);
        }
      } );
    } else {
      api.updateDnsRecord({ ...data, addPTR: data.type === 'a' ? Boolean(data.addPTR) : undefined }).then( result => {
        setBusy(false);
        if( result && result.success !== false ) {
          props.onClose();
          props.onRefresh();
        }
      } );
    }
  }

  function confirmReplacePtr() {
    setBusy(true);
    setPtrReplaceDialogOpen(false);
    doAddRecord(true).then( result => {
      setBusy(false);
      if( result && result.success !== false ) {
        props.onClose();
        props.onRefresh();
        setData(prevData => ({ ...props.data, zone_id: props.zoneId, type: props.recordType }));
        setInheritTTL(true);
      }
    } );
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  return (
    <>
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
        <Button disabled={busy} onClick={props.onClose}>{t('app.cancel')}</Button>
        <Button disabled={busy} onClick={submitForm}>{ props.new ? t('dns.addRecord') : t('common.saveChanges') }</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={ptrReplaceDialogOpen} onClose={() => setPtrReplaceDialogOpen(false)}>
      <DialogTitle>{t('dns.ptrExistsTitle')}</DialogTitle>
      <DialogContent>{t('dns.ptrExistsMessage')}</DialogContent>
      <DialogActions>
        <Button onClick={() => setPtrReplaceDialogOpen(false)}>{t('app.cancel')}</Button>
        <Button color="primary" variant="contained" onClick={confirmReplacePtr}>{t('dns.ptrReplace')}</Button>
      </DialogActions>
    </Dialog>
    </>
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
