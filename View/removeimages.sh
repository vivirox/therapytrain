echo
echo
echo Removing latest images for View AI
echo This command does not remove database images
echo
echo
docker image rm viewio/view-config:v1.0.0
docker image rm viewio/view-orchestrator:v1.0.0
docker image rm viewio/view-storage:v1.0.0
docker image rm viewio/view-semcell:v1.0.0
docker image rm viewio/view-processor:v1.0.0
docker image rm viewio/view-crawler:v1.0.0
docker image rm viewio/view-lexi:v1.0.0
docker image rm viewio/view-vector:v1.0.0
docker image rm viewio/view-embeddings:v1.0.0
docker image rm viewio/view-dashboard:v1.0.0
echo
echo
echo Complete.
echo
