import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import useAPI from './common/api';

export default function DnsZonePreviewDialog(props) {
  const [data, setData] = React.useState(null);
  const api = useAPI();

  function getZoneFilePreview() {
    api.getZoneFilePreview(props.zone.ID).then( response => {
      setData(response.zoneFile);
    } );
  }

  return (
    <Dialog fullWidth open={props.open} onClose={props.onClose} onEntering={getZoneFilePreview}>
      <DialogTitle>{props.zone.fqdn}</DialogTitle>
      <DialogContent>
        { data === null ? <CircularProgress /> : <TextField fullWidth multiline rows={20} defaultValue={data} InputProps={{readOnly: true, style: {fontFamily: 'monospace'}}} /> }
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
