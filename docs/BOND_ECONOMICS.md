# Bond economics

Amounts use nine decimal csprUSD units. The controller computes a base bond tier from action size and raises the required bond when the approver has negative reputation. A good history does not lower a tier below its base rate.

For every confirmed slash, the vault transfers half of the posted bond to the challenger and half to the InvoicePool reserve. A clean resolution returns the posted bond to the approver. `GET /api/coverage` exposes reserve balance, open exposure, historical settled bonds, and the largest observed action so a reviewer can see what remains uncovered.

The reserve is a protection mechanism, not a claim of complete payout insurance.
