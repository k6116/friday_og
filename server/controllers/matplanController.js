
const models = require('../models/_index');
const sequelize = require('../db/sequelize').sequelize;
const Treeize = require('treeize');


function show(req, res) {
  const matplanID = req.params.matplanID;
  sequelize.query(`
    SELECT *
    FROM supply.MaterialPlan T1
    LEFT JOIN projects.Projects T2
      ON T1.ProjectID = T2.ProjectID
    LEFT JOIN
      (SELECT T1.ScheduleID,
      T1.ProjectID,
      T2.BuildStatusID,
      T2.NeedByDate,
      T2.NeededQuantity,
      T3.BuildStatusName
      FROM demand.Schedules T1
      LEFT JOIN demand.SchedulesDetail T2
        ON T1.ScheduleID = T2.ScheduleID
      LEFT JOIN projects.BuildStatus T3
	      ON T2.BuildStatusID = T3.BuildStatusID
      ) T3
      ON T1.ProjectID = T3.ProjectID
      AND T1.BuildStatusID = T3.BuildStatusID
    WHERE MaterialPlanID = :matplanID
  `,{replacements: {matplanID: matplanID}, type: sequelize.QueryTypes.SELECT}
  )
  .then(matplan => {
    res.json(matplan);
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}

function indexProjects(req, res) {
  sequelize.query(
    // select NPIs and NMIs
    `SELECT DISTINCT
      T1.ProjectID,
      CONCAT(T1.ProjectName, ' - ', T2.ProjectTypeName) AS ProjectName
    FROM projects.Projects T1
    LEFT JOIN projects.ProjectTypes T2
      ON T1.ProjectTypeID = T2.ProjectTypeID
    WHERE T1.ProjectTypeID IN (2, 13)
    ORDER BY ProjectName`, {type: sequelize.QueryTypes.SELECT}
  )
  .then(matplanList => {
    res.json(matplanList);
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}

function showMatplans(req, res) {
  const projectID = req.params.projectID;
  sequelize.query(`
    SELECT 
      T1.ProjectID,
      T2.NeedByDate,
      T2.NeededQuantity,
      T2.BuildStatusID,
      T4.BuildStatusName,
      T3.MaterialPlanID,
      T3.LastUpdateDate AS MatplanUpdateDate,
      T3.LastUpdatedBy AS MatplanUpdatedBy,
      T5.FullName AS MatplanUpdatedByName
    FROM demand.Schedules T1
    LEFT JOIN demand.SchedulesDetail T2
        ON T1.ScheduleID = T2.ScheduleID
    LEFT JOIN supply.MaterialPlan T3
        ON T2.BuildStatusID = T3.BuildStatusID
    LEFT JOIN projects.BuildStatus T4
        ON T3.BuildStatusID = T4.BuildStatusID
    LEFT JOIN accesscontrol.Employees T5
      ON T3.LastUpdatedBy = T5.EmployeeID
    WHERE T1.ProjectID = :projectID
      AND T2.BuildStatusID IS NOT NULL`, {replacements: {projectID: projectID}, type: sequelize.QueryTypes.SELECT}
  )
  .then(buildList => {
    res.json(buildList);
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}

function showMatplanBom(req, res) {
  const projectID = req.params.projectID;
  sequelize.query(`EXECUTE dbo.billsDrillDownDetails :projectID, 'Project'`,{replacements: {projectID: projectID}, type: sequelize.QueryTypes.SELECT}
  )
  .then(bom => {
    bom.forEach( item => {
      if (item.Level > 1) {
        const indentedName = new Array(item.Level - 1).concat(item.ChildName);
        item.ChildIndentedName = indentedName.join('-');
      } else {
        item.ChildIndentedName = item.ChildName;
      }
    });
    res.json(bom);
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}

function showQuotesForPart(req, res) {
  const partID = req.params.partID;
  sequelize.query(`
    SELECT
      PartID AS [partID],
      QuoteID AS [quoteID],
      Supplier AS [supplier],
      MFGPartNumber AS [mfgPartNum],
      ID AS [breaks|id],
      LeadTime AS [breaks|leadTime],
      MinOrderQty AS [breaks|minOrderQty],
      Price AS [breaks|price],
      NRECharge AS [breaks|nreCharge]
    FROM parts.Quotes
    WHERE PartID = :partID`, {replacements: {partID: partID}, type: sequelize.QueryTypes.SELECT})
  .then(quoteList => {
    const quoteTree = new Treeize().options({input: {delimiter: '|'}});
    quoteTree.grow(quoteList);
    res.json(quoteTree.getData());
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}

function showOrdersForPart(req, res) {
  const matplanID = req.params.matplanID;
  const partID = req.params.partID;
  sequelize.query(`
    SELECT *
    FROM supply.MaterialOrder
    WHERE MaterialPlanID = :matplanID AND PartID = :partID`, {replacements: {matplanID: matplanID, partID: partID}, type: sequelize.QueryTypes.SELECT})
  .then(orderList => {
    res.json(orderList);
  })
  .catch(error => {
    res.status(400).json({
      title: 'Error (in catch)',
      error: {message: error}
    })
  });
}


module.exports = {
  show: show,
  indexProjects: indexProjects,
  showMatplans: showMatplans,
  showMatplanBom: showMatplanBom,
  showQuotesForPart: showQuotesForPart,
  showOrdersForPart: showOrdersForPart
}