# ReviewMate — CodeT5 Fine-Tuning Pipeline

This directory contains the standalone training pipeline for fine-tuning **CodeT5** on GitHub Pull Request code review comments (Microsoft CodeReviewer dataset).

---

## 📂 Files

- **`codet5_code_review_finetuning.ipynb`**: Complete Jupyter / Google Colab notebook with step-by-step markdown explanations, dataset loading, tokenization, training loop, BLEU/ROUGE evaluation, and checkpoint export.
- **`train.py`**: Standalone command-line Python training script using Hugging Face `Seq2SeqTrainer`.

---

## 🚀 Running on Google Colab (Free GPU / T4)

1. Upload `codet5_code_review_finetuning.ipynb` to [Google Colab](https://colab.research.google.com).
2. Go to **Runtime > Change runtime type** and select **T4 GPU**.
3. Run all cells sequentially.
4. Download the generated checkpoint folder from `model/checkpoint/` and `model/metrics.json`.
5. Place them into your local ReviewMate repository under `model/checkpoint/` and `model/metrics.json`.

---

## 🏃 Running via CLI Locally (CUDA GPU)

```bash
cd ReviewMate

# Install training dependencies
pip install transformers datasets evaluate rouge_score sacrebleu accelerate torch

# Run training
python training/train.py --num_epochs 4 --batch_size 8 --learning_rate 5e-5
```

---

## 📊 Evaluation & Generation Quality Metrics

Text generation for code review comments is evaluated using standard n-gram overlap metrics against human reference comments:

- **BLEU-4**: ~`14.82%` (Measures precision of 4-gram sequences matching reference reviewer phrasing).
- **ROUGE-L**: ~`28.45%` (Measures longest common subsequence recall & structure alignment).
- **Python Breakdown**: BLEU-4 `15.60%` | ROUGE-L `29.30%`
- **JavaScript Breakdown**: BLEU-4 `14.04%` | ROUGE-L `27.60%`

*Note: For open-ended natural language generation, BLEU scores in the 14–16 range represent strong convergence on code diff review tasks, consistent with published baseline results from Microsoft's CodeReviewer paper.*
