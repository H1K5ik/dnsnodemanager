import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import { useTranslation } from './common/LanguageContext';

export default function FwdGroupDialog(props) {
  const [data, setData] = React.useState({...props.data});
  const [busy, setBusy] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (props.open) setData({...props.data});
  }, [props.open, props.data]);

  function handleInput(event) {
    const name = event.currentTarget.name;
    const value = event.currentTarget.value;
    setData( prevData => ({...prevData, [name]: value}) );
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
      <DialogTitle>{props.new ? t('fwd.createGroup') : t('fwd.updateGroup')}</DialogTitle>
      <DialogContent>
        <TextField autoFocus required fullWidth variant="outlined" margin="dense" name="name" label={t('fwd.groupName')} value={data.name} onChange={handleInput} />
        <TextField required fullWidth variant="outlined" margin="dense" name="members" label={t('acls.ipAddresses')} helperText={t('acls.membersHelper')} value={data.members} onChange={handleInput} multiline minRows={3} maxRows={12} style={{ fontFamily: 'monospace' }} />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>{t('app.cancel')}</Button>
        <Button disabled={busy} onClick={submit}>{props.new ? t('fwd.addGroupBtn') : t('common.saveChanges')}</Button>
      </DialogActions>
    </Dialog>
  );
}

FwdGroupDialog.defaultProps = {
  data: { ID: 0, name: "", members: "" }
}
