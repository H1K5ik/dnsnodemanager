import React from "react";
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import LinearProgress from '@material-ui/core/LinearProgress';
import Button from '@material-ui/core/Button';
import AddCircle from '@material-ui/icons/AddCircle';
import DeleteIcon from '@material-ui/icons/Delete';
import PlayCircleFilled from '@material-ui/icons/PlayCircleFilled';

import ContentHeader from "./ContentHeader";
import DataUploadDialog from "./DataUploadDialog"
import DataImportDialog from "./DataImportDialog";
import { AuthenticationContext } from "./common/AuthenticationProvider";
import useAPI from './common/api';

export default function DataImporter(props) {
  const [data, setData] = React.useState([]);
  const [type, setType] = React.useState('records');
  const [showLoader, setLoader] = React.useState(false);
  const [zonesDialogOpen, setZonesDialogOpen] = React.useState(false);
  const [recordsDialogOpen, setRecordsDialogOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const session = React.useContext(AuthenticationContext);
  const canUse = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);
  const api = useAPI();

  const tableShape = {
    records: { zone: "Zone", name: "Name", type: "Type", data: "Data", ttl: "TTL" },
    zones: { view: "View", fqdn: "Zone FQDN", type: "Zone Type", nsgroup: "NS Group", fwdgroup: "Forwarder Group",  comment: "Comment" },
  }

  function analyzeZonesImport(form) {
    setLoader(true);
    const query = form.get('filetype') === 'csv' ? api.analyzeImportZonesCSV(form) : api.analyzeImportZonesFile(form);
    return query.then( result => {
      if( result.success ) {
        setType('zones');
        setData([...data, ...result.data]);
      }
      setLoader(false);
      return true;
    } );
  }

  function analyzeRecordsImport(form) {
    setLoader(true);
    const query = form.get('filetype') === 'csv' ? api.analyzeImportRecordsCSV(form) : api.analyzeImportRecordsFile(form);
    return query.then( result => {
      if( result.success ) {
        setType('records');
        setData([...data, ...result.data.records]);
      }
      setLoader(false);
      return true;
    } );
  }

  function startImport(options) {
    setImportDialogOpen(false);
    const query = type === "zones" ? api.importZones({zones: data, options: options}) : api.importRecords({records: data, options: options});
    return query.then( result => {
      if( result.success ) {
        setData([]);
        setType(null);
      }
      return true;
    } );
  }

  return (
    <>
      <ContentHeader title="Data Importer">
        <Button variant="contained" color="secondary" disabled={!Boolean(data.length)} startIcon={<PlayCircleFilled />} onClick={() => { setImportDialogOpen(true); }}>Start Import</Button>
        <DataImportDialog open={importDialogOpen} type={type} onSubmit={startImport} onClose={() => { setImportDialogOpen(false); }} />
        <Button variant="contained" color="secondary" disabled={!Boolean(data.length)} startIcon={<DeleteIcon />} style={{marginLeft: 10}} onClick={() => { setData([]); }}>Clear</Button>
        <Button variant="contained" color="primary" disabled={!canUse || (type !== 'zones' && Boolean(data.length))} startIcon={<AddCircle />} style={{marginLeft: 10}} onClick={() => { setZonesDialogOpen(true); }}>Add Zones</Button>
        <DataUploadDialog open={zonesDialogOpen} type="zones" onSubmit={analyzeZonesImport} onClose={() => { setZonesDialogOpen(false); }} />
        <Button variant="contained" color="primary" disabled={!canUse || (type !== 'records' && Boolean(data.length))} startIcon={<AddCircle />} style={{marginLeft: 10}} onClick={() => { setRecordsDialogOpen(true); }}>Add Records</Button>
        <DataUploadDialog open={recordsDialogOpen} type="records" onSubmit={analyzeRecordsImport} onClose={() => { setRecordsDialogOpen(false); }} />
      </ContentHeader>
      { data.length === 0 ? <></> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                { Object.values(tableShape[type]).map( (column, index) => <TableCell key={index}>{column}</TableCell> ) }
              </TableRow>
            </TableHead>
            <TableBody>
              { showLoader ? <></> : data.map( (row, index) => (
                <TableRow key={index}>
                  { Object.keys(tableShape[type]).map( (key, index) => <TableCell key={index}>{row[key]}</TableCell> ) }
                </TableRow>
              ) ) }
            </TableBody>
          </Table>
        </TableContainer>
      ) }
      { showLoader && ( <Box m={2}><LinearProgress /></Box> ) }
    </>
  );

}
