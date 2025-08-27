import React from 'react';

import Box from '@material-ui/core/Box';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import useAPI from './common/api';

function FullTextField(props) {
  return <TextField fullWidth variant="outlined" margin="dense" {...props} />;
}

function FullSelect(props) {
  return (
    <FormControl fullWidth variant="outlined" margin="dense">
      <InputLabel>{props.label}</InputLabel>
      <Select name={props.name} defaultValue={props.defaultValue} value={props.value} onChange={props.onChange} label={props.label}>
        { props.options.map( option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem> ) }
      </Select>
    </FormControl>
  );
}

const zoneTypes = [
  { key: "authoritative", label: "Authoritative Zone" },
  { key: "forward", label: "Forward Zone" },
  // { key: "stub", label: "Stub Zone" },
];

export default function DnsZoneDialog(props) {
  const [data, setData] = React.useState({...props.data, view: props.view});
  const [networkMode, setNetworkMode] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const nsGroups = props.nsGroups.map( group => ({key: group.ID, label: group.name}) );
  const fwdGroups = props.fwdGroups.map( group => ({key: group.ID, label: group.name}) );
  const api = useAPI();

  function handleInputChange(event) {
    let key   = event.target.name;
    let value = event.target.value;
    setData( prevData => { return { ...prevData, [key]: value }; } );
  }

  function submitForm() {
    setBusy(true);
    // Convert network info to string in the fqdn field, if in network mode. Server converts it to in-addr.arpa address...
    const sendData = networkMode ? {...data, fqdn: String(data.netip) + "/" + String(data.netmask)} : data;
    api.addDnsZone(sendData).then( () => {
      setBusy(false);
      props.onClose();
      props.onRefresh();
    } );
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  function init() {
    // Set first NS/FWD Group as default value for new zones
    if( ! props.new ) return true;
    if( nsGroups.length ) setData( prevData => { return { ...prevData, ns_group: props.nsGroups[0].ID }; } );
    if( fwdGroups.length ) setData( prevData => { return { ...prevData, fwd_group: props.fwdGroups[0].ID }; } );
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey} onEntering={init}>
      <DialogTitle>{ props.new ? 'Add New Zone' : 'Edit Zone Properties' }</DialogTitle>
      <DialogContent>
        { props.new && (
          <Box>
            <FormControlLabel
              control={<Switch checked={networkMode} onChange={event => { setNetworkMode(event.target.checked)}} name="networkMode" color="primary" />}
              label="Network Mode for Reverse Zones"
            />
          </Box>
        ) }
        { networkMode ? (
          <Box>
            <TextField variant="outlined" margin="dense" name="netip" value={data.netip} onChange={handleInputChange} label="Network IP Address" />
            <FormControl variant="outlined" margin="dense" style={{marginLeft: 10}}>
              <InputLabel>Network Bits</InputLabel>
              <Select name="netmask" value={data.netmask} onChange={handleInputChange} label="Network Bits">
                <MenuItem value={8}><strong>8</strong> (255.0.0.0)</MenuItem>
                <MenuItem value={16}><strong>16</strong> (255.255.0.0)</MenuItem>
                <MenuItem value={24}><strong>24</strong> (255.255.255.0)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        ) : <FullTextField autoFocus required name="fqdn" label="Zone FQDN" value={data.fqdn} onChange={handleInputChange} /> }
        <FullSelect name="type" label="Zone Type" value={data.type} options={zoneTypes} onChange={handleInputChange} />
        <FullSelect name="ns_group" label="Nameserver Group" value={data.ns_group} options={nsGroups} onChange={handleInputChange} />
        { data.type === 'forward' && <FullSelect name="fwd_group" label="Forwarder Group" value={data.fwd_group} options={fwdGroups} onChange={handleInputChange} /> }
        <FullTextField name="comment" label="Comment" value={data.comment} onChange={handleInputChange} />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submitForm}>{ props.new ? 'Add Zone' : 'Save Changes' }</Button>
      </DialogActions>
    </Dialog>
  )
}

DnsZoneDialog.defaultProps = {
  open: false,
  new: false,
  data: {
    ID: 0,
    fqdn: '',
    netip: '',
    netmask: 24,
    type: 'authoritative',
    ns_group: '',
    fwd_group: '',
    view: 'default',
    comment: '',
  }
}
