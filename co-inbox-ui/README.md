## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Wed Jul 22 2026 16:51:05 GMT+0000 (Coordinated Universal Time)|
|**App Generator**<br>@sap/generator-fiori-freestyle|
|**App Generator Version**<br>1.8.4|
|**Generation Platform**<br>SAP Business Application Studio|
|**Template Used**<br>simple|
|**Service Type**<br>None|
|**Service URL**<br>N/A
|**Module Name**<br>co-inbox-ui|
|**Application Title**<br>Change Order Approval Form|
|**Namespace**<br>|
|**UI5 Theme**<br>sap_fiori_3|
|**UI5 Version**<br>1.82.2|
|**Enable Code Assist Libraries**<br>False|
|**Enable TypeScript**<br>False|
|**Add Eslint configuration**<br>False|

## co-inbox-ui

Change Order Approval workflow task UI application

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  In order to launch the generated app, simply run the following from the generated app root folder:

```
    npm start
```

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)


<HTML
                    xmlns="sap.ui.core"
                    visible="{= ${approverProgress>isLast} === false }"
                    content="&lt;div style='width:2rem;height:2px;background-color:#89919a;display:inline-block;vertical-align:middle;margin:0 0.25rem;'&gt;&lt;/div&gt;"/>


