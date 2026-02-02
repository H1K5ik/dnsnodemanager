import React from "react";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import { useTranslation } from './common/LanguageContext';

export default function NsGroupDialog(props) {
  const { t } = useTranslation();

  function pressKey(event) {
    if(event.key === 'Enter') props.onSubmit();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} onKeyPress={pressKey}>
      <DialogTitle>{props.new ? t('nsgroups.createGroup') : t('nsgroups.updateGroupName')}</DialogTitle>
      <DialogContent>
        <TextField autoFocus required fullWidth variant="outlined" name="name" label={t('nsgroups.nsGroupName')} defaultValue={props.defaultName} onChange={props.onInput} />
      </DialogContent>
      <DialogActions>
        <Button disabled={props.blocked} onClick={props.onClose}>{t('app.cancel')}</Button>
        <Button disabled={props.blocked} onClick={props.onSubmit}>{props.new ? t('fwd.addGroupBtn') : t('common.saveChanges')}</Button>
      </DialogActions>
    </Dialog>
  );

}
