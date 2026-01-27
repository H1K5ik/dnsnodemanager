import React from 'react';
import Box from '@material-ui/core/Box';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import Divider from '@material-ui/core/Divider';
import CircularProgress from '@material-ui/core/CircularProgress';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import InputLabel from '@material-ui/core/InputLabel';
import Checkbox from '@material-ui/core/Checkbox';
import useAPI from './common/api';

function DefaultsTextField(props) {
  return <TextField variant="outlined" margin="dense" style={{marginRight: 8}} {...props} />
}

export default function DnsZoneConfigDialog(props) {
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState(null);
  const [acls, setAcls] = React.useState([]);
  const [nsGroups, setNsGrops] = React.useState([]);
  const [fwdGroups, setFwdGrops] = React.useState([]);
  const [inheritSOA, setInheritSOA] = React.useState(true);
  const [inheritTTL, setInheritTTL] = React.useState(true);
  const api = useAPI();

  function submitForm() {
    setBusy(true);
    api.updateDnsZone(data).then( result => {
      setBusy(false);
      if( result ) {
        props.onClose();
        props.onRefresh();
      }
    } );
  }

  function toggleSwitch(event) {
    let newBool;
    switch( event.target.name ) {
      case "inheritTTL":
        newBool = !inheritTTL;
        setData( prevData => ({ ...prevData, ttl: newBool ? null : 3600 }) );
        setInheritTTL(newBool);
      break;
      case "inheritSOA":
        newBool = !inheritSOA;
        setData( prevData => ({ ...prevData,
          soa_rname: newBool ? null : 'hostmaster.' + prevData.fqdn,
          soa_refresh: newBool ? null : 86400,
          soa_expire: newBool ? null : 3600000,
          soa_retry: newBool ? null : 7200,
          soa_ttl: newBool ? null : 1800,
        }) );
        setInheritSOA(newBool);
      break;
      default:
        setData(prevData => ({ ...prevData, dynamicUpdates: !prevData.dynamicUpdates, dynamicUpdatesAcls: [] }));
      break;
    }
  }

  function handleInputChange(event) {
    const key   = event.target.name;
    const value = event.target.value;
    setData(prevData => ({ ...prevData, [key]: value }));
  }

  function handleAclChange(event) {
    const id  = parseInt(event.target.value);
    const add = event.target.checked;
    console.log(id, add);
    setData( prevData => {
      if( add ) return { ...prevData, dynamicUpdatesAcls: [ ...prevData.dynamicUpdatesAcls, id ] };
      else return { ...prevData, dynamicUpdatesAcls: prevData.dynamicUpdatesAcls.filter(acl => acl !== id) };
    } );
  }

  function getZoneInfo() {
    setData(null);
    api.getDnsZone(props.zoneId).then(setData);
  }

  function getNsGroups() {
    api.getNsGroups().then(setNsGrops);
  }

  function getFwdGroups() {
    api.getFwdGroups().then(setFwdGrops);
  }

  function getAcls() {
    api.getAcls().then(setAcls);
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  React.useEffect(getNsGroups, []);  // eslint-disable-line
  React.useEffect(getFwdGroups, []);  // eslint-disable-line
  React.useEffect(getAcls, []);  // eslint-disable-line

  return (
    <Dialog open={props.open} onClose={props.onClose} TransitionProps={{ onEntering: getZoneInfo }} onKeyPress={pressKey}>
      <DialogTitle>DNS Zone: {data === null ? '' : data.fqdn}</DialogTitle>
      <DialogContent>
        { data === null ? <CircularProgress /> : (
        <>
          <Box>
            { data.type === 'authoritative' ? <DefaultsTextField name="soa_serial" label="Zone Serial" value={data.soa_serial} onChange={handleInputChange} /> : (
              <FormControl fullWidth variant="outlined" margin="dense">
                <InputLabel>Forwarder Group</InputLabel>
                <Select name="forwarder_group" value={data.forwarder_group} onChange={handleInputChange} label="Forwarder Group">
                  { fwdGroups.map( option => <MenuItem key={option.ID} value={option.ID}>{option.name}</MenuItem> ) }
                </Select>
              </FormControl>
            ) }
            <FormControl fullWidth variant="outlined" margin="dense">
              <InputLabel>Nameserver Group</InputLabel>
              <Select name="ns_group" value={data.ns_group} onChange={handleInputChange} label="Nameserver Group">
                { nsGroups.map( option => <MenuItem key={option.ID} value={option.ID}>{option.name}</MenuItem> ) }
              </Select>
            </FormControl>
            <DefaultsTextField fullWidth name="comment" label="Comment" value={data.comment || ''} onChange={handleInputChange} />
            <DefaultsTextField fullWidth multiline rows={4} name="config" label="Zone Configuration Lines" value={data.config || ''} onChange={handleInputChange} helperText="Any additional config lines to be added into the zone {} definition" />
          </Box>
          { data.type === 'authoritative' && (
            <>
              <Box>
                <FormControlLabel
                  control={<Switch checked={inheritSOA} name="inheritSOA" onChange={toggleSwitch} color="primary" disabled={props.readOnly} />}
                  label="Inherit SOA Details from view defaults"
                />
              </Box>
              <Box display={ inheritSOA ? "none" : "block" }>
                <DefaultsTextField name="soa_rname" label="SOA RNAME" value={data.soa_rname} onChange={handleInputChange} />
                <DefaultsTextField name="soa_refresh" label="SOA Refresh" value={data.soa_refresh} onChange={handleInputChange} />
                <DefaultsTextField name="soa_retry" label="SOA Retry" value={data.soa_retry} onChange={handleInputChange} />
                <DefaultsTextField name="soa_expire" label="SOA Expire" value={data.soa_expire} onChange={handleInputChange} />
                <DefaultsTextField name="soa_ttl" label="SOA Negative Caching TTL" value={data.soa_ttl} onChange={handleInputChange} />
              </Box>
              <Box>
                <FormControlLabel
                  control={<Switch checked={inheritTTL} name="inheritTTL" onChange={toggleSwitch} color="primary" disabled={props.readOnly} />}
                  label="Inherit default TTL from view defaults"
                />
              </Box>
              <Box display={ inheritTTL ? "none" : "block" }>
                <DefaultsTextField name="ttl" label="Default Record TTL" value={data.ttl} onChange={handleInputChange} />
              </Box>
              <Divider />
              <Box>
                <FormControlLabel
                  control={<Switch checked={data.dynamicUpdates} name="dynamicUpdates" onChange={toggleSwitch} color="primary" disabled={props.readOnly} />}
                  label="Allow Dynamic Updates"
                />
              </Box>
              <Box display={ data !== null && data.dynamicUpdates ? "block" : "none" }>
                { acls.map( acl => (
                  <FormControlLabel key={acl.ID} label={acl.name} control={<Checkbox checked={data.dynamicUpdatesAcls.includes(acl.ID)} onChange={handleAclChange} value={acl.ID} />} />
                ) ) }
                { ! Boolean(acls.length) && <span>No ACLs found. Add Access lists to allow dynamic updates.</span> }
              </Box>
            </>
          ) }
        </>
        ) }
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy || props.readOnly} onClick={submitForm}>Apply Changes</Button>
      </DialogActions>
    </Dialog>
  );
}
