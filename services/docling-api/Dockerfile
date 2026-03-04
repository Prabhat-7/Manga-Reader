# Use a base image that includes CUDA (important for Docling speed)
FROM runpod/pytorch:1.0.3-cu1300-torch260-ubuntu2404

# Install dependencies
# (Ensure your requirements.txt includes 'docling' and 'runpod')
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy your code
COPY . .
ENV DOCLING_ARTIFACTS_PATH=/app/models

RUN mkdir -p ${DOCLING_ARTIFACTS_PATH}
RUN docling-tools models download --output-dir ${DOCLING_ARTIFACTS_PATH}
# Start the RunPod handler instead of Uvicorn
CMD [ "python", "-u", "/handler.py" ]
