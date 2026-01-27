import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText'
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListSubheader from '@material-ui/core/ListSubheader';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import AddCircle from '@material-ui/icons/AddCircle';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Divider from '@material-ui/core/Divider';
import LinearProgress from '@material-ui/core/LinearProgress';

import useAPI from './common/api';

function DefaultsTextField(props) {
  return <TextField variant="outlined" margin="dense" style={{marginRight: 8}} {...props} />
}

function AddDialog(props) {
  const [busy, setBusy] = React.useState();
  const [name, setName] = React.useState('');
  const api = useAPI();

  function submitForm() {
    setBusy(true);
    api.addView(name).then( () => {
      setBusy(false);
      props.onClose();
      props.onRefresh();
    } );
  }

  function handleInputChange(event) {
    setName(event.target.value);
  }

  function pressKey(event) {
    if(event.key === 'Enter') submitForm();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey}>
      <DialogTitle>Add New View</DialogTitle>
      <DialogContent>
        <TextField required fullWidth variant="outlined" name="name" label="View Name" onChange={handleInputChange} />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy} onClick={submitForm}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DnsViewsDialog(props) {
  const [busy, setBusy] = React.useState();
  const [activeView, setActiveView] = React.useState('default');
  const [activeViewData, setActiveViewData] = React.useState(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const api = useAPI();

  function switchView(name) {
    setActiveView(name);
    setActiveViewData(getViewByName(name));
  }

  function getViewByName(name) {
    const v = props.views.find(view => (view.name === name));
    if( ! v ) return false;
    v.oldName = v.name; // attach old name to object so we can track name changes
    return v;
  }

  function submitForm() {
    setBusy(true);
    api.updateView(activeViewData).then( result => {
      setBusy(false);
      if( result ) {
        props.onClose();
        props.onRefresh();
      }
    } );
  }

  function deleteView(name) {
    // ToDo :: Add dialog to select what happens with zones
    // move to default, delete...?
    setBusy(true);
    api.deleteView(name).then( () => {
      setBusy(false);
      props.onClose();
      props.onRefresh();
    } );
  }

  function handleInputChange(event) {
    let key   = event.target.name;
    let value = event.target.value;
    if( activeViewData === null ) {
      setActiveViewData(getViewByName(activeView));
    }
    setActiveViewData( prevData => { return { ...prevData, [key]: value }; } );
  }

  return (
    <Dialog maxWidth="md" open={props.open} onClose={props.onClose} TransitionProps={{ onEntering: () => { switchView('default'); } }}>
      <DialogTitle>Manage DNS Views</DialogTitle>
      <DialogContent>
        <Grid container justifyContent="space-between" spacing={2} wrap="nowrap">
          <Grid item>
            <List>
              <ListSubheader>Views</ListSubheader>
              { props.views.map( (view, index) => (
                <ListItem button key={index} onClick={() => { switchView(view.name); }}>
                  <ListItemIcon>
                    <VisibilityIcon color={activeView === view.name ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText>{view.name}</ListItemText>
                  { view.name !== 'default' && ! props.readOnly && (
                    <ListItemSecondaryAction>
                      <IconButton size="small" edge="end" children={<DeleteIcon />} onClick={() => { deleteView(view.name); }} />
                    </ListItemSecondaryAction>
                  ) }
                </ListItem>
              ) ) }
            </List>
            <Button disabled={busy || props.readOnly} variant="outlined" onClick={() => { setAddDialogOpen(true); }} startIcon={<AddCircle />}>New View</Button>
            <AddDialog open={addDialogOpen} onClose={() => { setAddDialogOpen(false); }} onRefresh={props.onRefresh} />
          </Grid>
          <Grid item>
            { activeViewData === null ? <LinearProgress /> : (
              <>
                <TextField required fullWidth disabled={activeViewData.name === 'default'} variant="outlined" margin="dense" name="name" label="View Name" value={activeViewData.name} onChange={handleInputChange} />
                <TextField fullWidth multiline rows={6} variant="outlined" margin="dense" name="config" label="View Configuration Lines" value={activeViewData.config} onChange={handleInputChange} helperText="Any additional config lines to be added into the view {}" />
                <Divider />
                <Typography variant="h6">Zone Defaults</Typography>
                <div>
                  <DefaultsTextField name="ttl" label="Default Record TTL" value={activeViewData.ttl} onChange={handleInputChange} />
                  <DefaultsTextField name="soa_rname" label="SOA RNAME" value={activeViewData.soa_rname} onChange={handleInputChange} />
                </div>
                <div>
                  <DefaultsTextField name="soa_refresh" label="SOA Refresh" value={activeViewData.soa_refresh} onChange={handleInputChange} />
                  <DefaultsTextField name="soa_retry" label="SOA Retry" value={activeViewData.soa_retry} onChange={handleInputChange} />
                </div>
                <div>
                  <DefaultsTextField name="soa_expire" label="SOA Expire" value={activeViewData.soa_expire} onChange={handleInputChange} />
                  <DefaultsTextField name="soa_ttl" label="SOA Negative Caching TTL" value={activeViewData.soa_ttl} onChange={handleInputChange} />
                </div>
              </>
            ) }
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy || props.readOnly} onClick={submitForm}>Apply Changes</Button>
      </DialogActions>
    </Dialog>
  );
}
