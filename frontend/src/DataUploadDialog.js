import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import ArrowForward from '@material-ui/icons/ArrowForward';

import useAPI from './common/api';

export default function DataUploadDialog(props) {
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [type, setType] = React.useState('csv');
  const [nsGroups, setNsGroups] = React.useState([]);
  const [fwdGroups, setFwdGroups] = React.useState([]);
  const [views, setViews] = React.useState([]);
  const api = useAPI();

  function getGroupsAndViews() {
    api.getNsGroups().then( nsgroups => {
      api.getDnsViews().then( views => {
        api.getFwdGroups().then( fwdgroups => {
          setNsGroups(nsgroups);
          setViews(views);
          setFwdGroups(fwdgroups);
        } );
      } );
    } );
  }

  function handleChange(event) {
    setFile(event.target.files[0].name);
  }

  function changeType(event) {
    setType(event.target.value);
  }

  function submit() {
    setBusy(true);
    close();
    const data = new FormData(document.getElementById('import-file-form'));
    props.onSubmit(data).then( () => {
      setBusy(false);
    } );
  }

  function close() {
    setFile(null);
    setType('csv');
    setBusy(false);
    props.onClose();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onEntering={getGroupsAndViews}>
      <DialogTitle>Import {props.type}</DialogTitle>
      <DialogContent>
        <form id="import-file-form" encType="multipart/form-data">
          { type === 'csv' && <Box m={1}>CSV Import Sample: <Link href={"samples/" + props.type + ".csv"} download><ArrowForward color="disabled" fontSize="small" style={{verticalAlign: "top"}} /> Download</Link></Box> }
          <Box m={1}>
            <FormControl variant="outlined" margin="dense">
              <InputLabel>File Type</InputLabel>
              <Select name="filetype" defaultValue="csv" label="File Type" onChange={changeType}>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="bind">{ props.type === 'records' ? 'Bind Zonefile' : 'Bind Config' }</MenuItem>
              </Select>
            </FormControl>
          </Box>
          { type === 'bind' && props.type === 'zones' && (
            <>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>View</InputLabel>
                <Select name="view" defaultValue="default" label="View">
                  { views.map( (view, index) => <MenuItem key={index} value={view.name}>{view.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>Nameserver Group</InputLabel>
                <Select name="nsgroup" label="Nameserver Group" style={{minWidth:180}} defaultValue={nsGroups[0].name}>
                  { nsGroups.map( (nsgroup, index) => <MenuItem key={index} value={nsgroup.name}>{nsgroup.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>Forwarder Group</InputLabel>
                <Select name="fwdgroup" label="Forwarder Group" style={{minWidth:180}} defaultValue={fwdGroups[0].name}>
                  { fwdGroups.map( (group, index) => <MenuItem key={index} value={group.name}>{group.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            </>
          ) }
          <Box m={1}>
            <label htmlFor="upload-file">
              <input style={{ display: 'none' }} id="upload-file" name="file" type="file" onChange={handleChange} />
              <Button variant="contained" component="span">Select File</Button>
            </label>
          </Box>
          <Box m={1}>
            { file !== null && "File: " + file }
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={close}>Cancel</Button>
        <Button disabled={busy} onClick={submit}>Analyze File</Button>
      </DialogActions>
    </Dialog>
  );
}
