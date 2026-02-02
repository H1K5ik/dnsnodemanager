import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';

import { useTranslation } from './common/LanguageContext';

export default function UserDialog(props) {
  const [data, setData] = React.useState({...props.data, password: ''});
  const [busy, setBusy] = React.useState(false);
  const { t } = useTranslation();

  function handleInputChange(event) {
    const key = event.target.name;
    const value = event.target.value;
    setData( prevData => ({...prevData, [key]: value}) );
  }

  function submit() {
    setBusy(true);
    props.onSubmit(data).then( result => {
      if( ! result ) setBusy(false);
    } );
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs">
      <DialogTitle>{props.new ? t('users.createUser') : t('users.updateUser')}</DialogTitle>
      <DialogContent>
        <form>
          <TextField autoFocus fullWidth variant="outlined" margin="dense" name="name" label={t('users.username')} value={data.name} onChange={handleInputChange} />
          <TextField fullWidth variant="outlined" margin="dense" name="password" type="password" label={props.new ? t('login.password') : t('users.newPassword')} helperText={props.new ? null : t('users.passwordHelper')} value={data.password} onChange={handleInputChange} />
          <FormControl fullWidth variant="outlined" margin="dense">
            <InputLabel>{t('users.role')}</InputLabel>
            <Select name="role" value={data.role} onChange={handleInputChange} label={t('users.role')}>
              { Object.entries(props.roles).map( role => <MenuItem key={role[0]} value={role[0]}>{t('roles.' + role[0])}</MenuItem> ) }
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={props.onClose}>{t('app.cancel')}</Button>
        <Button disabled={busy} onClick={submit}>{props.new ? t('users.addUserBtn') : t('common.saveChanges')}</Button>
      </DialogActions>
    </Dialog>
  );
}

UserDialog.defaultProps = {
  data: { name: '', role: '' }
}
