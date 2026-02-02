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

import { useTranslation } from './common/LanguageContext';
import useAPI from './common/api';

export default function DataUploadDialog(props) {
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [type, setType] = React.useState('csv');
  const [nsGroups, setNsGroups] = React.useState([]);
  const [fwdGroups, setFwdGroups] = React.useState([]);
  const [views, setViews] = React.useState([]);
  const { t } = useTranslation();
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
    <Dialog open={props.open} onClose={props.onClose} TransitionProps={{ onEntering: getGroupsAndViews }}>
      <DialogTitle>{t("importer.importType", { type: props.type })}</DialogTitle>
      <DialogContent>
        <form id="import-file-form" encType="multipart/form-data">
          { type === 'csv' && <Box m={1}>{t("importer.csvSample")} <Link href={"samples/" + props.type + ".csv"} download><ArrowForward color="disabled" fontSize="small" style={{verticalAlign: "top"}} /> {t("importer.download")}</Link></Box> }
          <Box m={1}>
            <FormControl variant="outlined" margin="dense">
              <InputLabel>{t("importer.fileType")}</InputLabel>
              <Select name="filetype" defaultValue="csv" label={t("importer.fileType")} onChange={changeType}>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="bind">{ props.type === 'records' ? t("importer.bindZonefile") : t("importer.bindConfig") }</MenuItem>
              </Select>
            </FormControl>
          </Box>
          { type === 'bind' && props.type === 'zones' && (
            <>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>{t("importer.view")}</InputLabel>
                <Select name="view" defaultValue="default" label={t("importer.view")}>
                  { views.map( (view, index) => <MenuItem key={index} value={view.name}>{view.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>{t("importer.nsGroup")}</InputLabel>
                <Select name="nsgroup" label={t("importer.nsGroup")} style={{minWidth:180}} defaultValue={nsGroups[0].name}>
                  { nsGroups.map( (nsgroup, index) => <MenuItem key={index} value={nsgroup.name}>{nsgroup.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            <Box m={1}>
              <FormControl variant="outlined" margin="dense">
                <InputLabel>{t("importer.fwdGroup")}</InputLabel>
                <Select name="fwdgroup" label={t("importer.fwdGroup")} style={{minWidth:180}} defaultValue={fwdGroups[0].name}>
                  { fwdGroups.map( (group, index) => <MenuItem key={index} value={group.name}>{group.name}</MenuItem> ) }
                </Select>
              </FormControl>
            </Box>
            </>
          ) }
          <Box m={1}>
            <label htmlFor="upload-file">
              <input style={{ display: 'none' }} id="upload-file" name="file" type="file" onChange={handleChange} />
              <Button variant="contained" component="span">{t("importer.selectFile")}</Button>
            </label>
          </Box>
          <Box m={1}>
            { file !== null && t("importer.fileLabel", { name: file }) }
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={close}>{t("app.cancel")}</Button>
        <Button disabled={busy} onClick={submit}>{t("importer.analyzeFile")}</Button>
      </DialogActions>
    </Dialog>
  );
}
