# FTM App — Test Accounts

All accounts use the same password: **`Test1234`**

| Email | Name | Role(s) | Permissions |
|-------|------|---------|-------------|
| `admin@ftm.com` | Super Admin | ADMIN, SUPER_ADMIN | Full access: approve users, assign roles, manage all content, delete records |
| `pastor@ftm.com` | John Pastor | PASTOR | Create announcements, manage youth profiles |
| `worship.leader@ftm.com` | Mary Santos | WORSHIP_LEADER | Create worship lineups, create worship schedules |
| `worship.head@ftm.com` | James Cruz | WORSHIP_TEAM_HEAD | Approve/reject lineups, approve/reject substitution requests, create schedules |
| `guitarist@ftm.com` | Peter Reyes | GUITARIST | View lineups, request substitutions |
| `keyboardist@ftm.com` | Anna Garcia | KEYBOARDIST | View lineups, request substitutions |
| `drummer@ftm.com` | Mark Lopez | DRUMMER | View lineups, request substitutions |
| `bassist@ftm.com` | Luke Torres | BASSIST | View lineups, request substitutions |
| `singer@ftm.com` | Grace Rivera | SINGER | View lineups, request substitutions |
| `leader@ftm.com` | David Mendoza | LEADER | Create announcements, manage youth profiles |
| `outreach@ftm.com` | Ruth Flores | OUTREACH_WORKER | Manage youth profiles |
| `user@ftm.com` | Normal User | NORMAL_USER | View announcements, prayer requests, worship schedules |

## Re-seed Command

```bash
cd ~/Projects/church-app-api
npx ts-node src/seeds/seed-test-accounts.ts
```
